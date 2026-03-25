"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { XP_VALUES } from "@/lib/xp/xpConfig";
import {
  getLevelFromXp,
  getXpIntoCurrentLevel,
  getXpNeededForNextLevel,
} from "@/lib/xp/xpHelpers";
import type { XpEventType } from "@/app/types";

// ─── Row types ────────────────────────────────────────────────────────────────

type ProgressionRow = {
  user_id: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_check_in_date: string | null;
};

type XpEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  event_date: string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useXp(userId: string | null) {
  const [totalXp, setTotalXp]             = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [todayEvents, setTodayEvents]     = useState<XpEventRow[]>([]);
  const [loading, setLoading]             = useState(true);

  // ── Load progression + today's events on mount / user change ─────────────
  // Using .then() chain to stay within the allowed pattern for this ESLint rule.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const today = todayStr();

    Promise.all([
      supabase
        .from("user_progression")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("xp_events")
        .select("*")
        .eq("user_id", userId)
        .eq("event_date", today),
    ]).then(([progRes, eventsRes]) => {
      if (progRes.data) {
        const row = progRes.data as ProgressionRow;
        setTotalXp(row.total_xp);
        setCurrentStreak(row.current_streak);
        setLongestStreak(row.longest_streak);
      }
      setTodayEvents((eventsRes.data as XpEventRow[]) ?? []);
      setLoading(false);
    }).catch((err: unknown) => {
      console.error("useXp load error:", err);
      setLoading(false);
    });
  }, [userId]);

  // ── refreshState: called after mutations to re-sync from DB ──────────────
  const refreshState = useCallback(async (uid: string) => {
    const supabase = createClient();
    const today = todayStr();

    const [progRes, eventsRes] = await Promise.all([
      supabase
        .from("user_progression")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("xp_events")
        .select("*")
        .eq("user_id", uid)
        .eq("event_date", today),
    ]);

    if (progRes.data) {
      const row = progRes.data as ProgressionRow;
      setTotalXp(row.total_xp);
      setCurrentStreak(row.current_streak);
      setLongestStreak(row.longest_streak);
    }
    setTodayEvents((eventsRes.data as XpEventRow[]) ?? []);
  }, []);

  // ── awardXp ──────────────────────────────────────────────────────────────
  const awardXp = useCallback(
    async (eventType: XpEventType, metadata?: Record<string, unknown>) => {
      if (!userId) return;

      const supabase = createClient();
      const today = todayStr();
      const yesterday = yesterdayStr();

      // 1. Idempotency check: bail if this event already exists for today
      const { data: existing } = await supabase
        .from("xp_events")
        .select("id")
        .eq("user_id", userId)
        .eq("event_type", eventType)
        .eq("event_date", today)
        .maybeSingle();

      if (existing) return; // already awarded today

      // 2. Insert the XP event
      const xpAmount = XP_VALUES[eventType];
      const { error: insertError } = await supabase.from("xp_events").insert({
        user_id:    userId,
        event_type: eventType,
        xp_amount:  xpAmount,
        event_date: today,
        metadata:   metadata ?? null,
      });

      if (insertError) {
        console.error("Failed to insert xp_event:", insertError);
        return;
      }

      // 3. Fetch current progression to compute streak
      const { data: progRow } = await supabase
        .from("user_progression")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const current = progRow as ProgressionRow | null;
      const prevXp          = current?.total_xp ?? 0;
      const prevStreak      = current?.current_streak ?? 0;
      const prevLongest     = current?.longest_streak ?? 0;
      const lastCheckInDate = current?.last_check_in_date ?? null;

      // 4. Streak logic — at most one streak extension per calendar day
      let newStreak  = prevStreak;
      let newLongest = prevLongest;

      const alreadyTouchedToday = lastCheckInDate === today;

      if (!alreadyTouchedToday) {
        if (lastCheckInDate === yesterday) {
          // Continuing streak
          newStreak = prevStreak + 1;
          if (newStreak > newLongest) newLongest = newStreak;
        } else {
          // Broken or fresh streak
          newStreak = 1;
          if (newStreak > newLongest) newLongest = newStreak;
        }
      }

      // 5. Award streak_extended XP if streak genuinely increased
      let streakXpBonus = 0;
      if (!alreadyTouchedToday && newStreak > prevStreak) {
        const { data: streakEventExists } = await supabase
          .from("xp_events")
          .select("id")
          .eq("user_id", userId)
          .eq("event_type", "streak_extended")
          .eq("event_date", today)
          .maybeSingle();

        if (!streakEventExists) {
          const { error: streakInsertError } = await supabase
            .from("xp_events")
            .insert({
              user_id:    userId,
              event_type: "streak_extended",
              xp_amount:  XP_VALUES.streak_extended,
              event_date: today,
              metadata:   null,
            });
          if (!streakInsertError) {
            streakXpBonus = XP_VALUES.streak_extended;
          }
        }
      }

      // 6. Upsert user_progression
      const newTotalXp = prevXp + xpAmount + streakXpBonus;
      const { error: upsertError } = await supabase
        .from("user_progression")
        .upsert({
          user_id:            userId,
          total_xp:           newTotalXp,
          current_streak:     newStreak,
          longest_streak:     newLongest,
          last_check_in_date: today,
          updated_at:         new Date().toISOString(),
        });

      if (upsertError) {
        console.error("Failed to upsert user_progression:", upsertError);
        return;
      }

      // 7. Refresh local state
      await refreshState(userId);
    },
    [userId, refreshState],
  );

  // ── Derived values ────────────────────────────────────────────────────────

  const level            = getLevelFromXp(totalXp);
  const xpIntoLevel      = getXpIntoCurrentLevel(totalXp);
  const xpNeededForLevel = getXpNeededForNextLevel(totalXp);

  const hasCheckedInToday = todayEvents.some(
    (e) =>
      e.event_type === "daily_login" ||
      e.event_type === "rest_day_check_in" ||
      e.event_type === "workout_completed",
  );

  const hasCompletedWorkoutToday = todayEvents.some(
    (e) => e.event_type === "workout_completed",
  );

  // When there is no userId, we are not in a loading state
  const resolvedLoading = userId ? loading : false;

  return {
    totalXp,
    level,
    xpIntoLevel,
    xpNeededForLevel,
    currentStreak,
    longestStreak,
    loading: resolvedLoading,
    hasCheckedInToday,
    hasCompletedWorkoutToday,
    awardXp,
  };
}
