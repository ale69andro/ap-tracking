"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrainingPlan, TrainingProgress } from "@/app/types";

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function upsertPlan(
  userId: string,
  plan: TrainingPlan,
  progress: TrainingProgress,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("training_plans")
    .upsert(
      { user_id: userId, training_plan: plan, training_progress: progress, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

async function deletePlan(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("training_plans")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainingPlan(userId: string | null) {
  const [plan,     setPlanState]     = useState<TrainingPlan | null>(null);
  const [progress, setProgressState] = useState<TrainingProgress | null>(null);

  // Load from training_plans on mount / userId change.
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from("training_plans")
      .select("training_plan, training_progress")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load training plan:", {
            message: error.message,
            code:    error.code,
            details: error.details,
            hint:    error.hint,
          });
          return;
        }
        setPlanState((data?.training_plan     as TrainingPlan     | null) ?? null);
        setProgressState((data?.training_progress as TrainingProgress | null) ?? null);
      });
  }, [userId]);

  /** Persist a new or updated plan. Resets progress if the plan ID changed. */
  const setPlan = useCallback((newPlan: TrainingPlan) => {
    if (!userId) return;

    const nextProgress: TrainingProgress =
      plan?.id === newPlan.id && progress !== null
        ? progress
        : { planId: newPlan.id, lastCompletedDayIndex: null, lastCompletedAt: null };

    setPlanState(newPlan);
    setProgressState(nextProgress);
    upsertPlan(userId, newPlan, nextProgress).catch((err) =>
      console.error("Failed to save training plan:", err),
    );
  }, [userId, plan, progress]);

  /** Mark a day (by 0-based index) as the most recently completed. Clears any skip override. */
  const markDayCompleted = useCallback((dayIndex: number) => {
    if (!userId || !plan) return;
    const updated: TrainingProgress = {
      planId: plan.id,
      lastCompletedDayIndex: dayIndex,
      lastCompletedAt: Date.now(),
      skippedToIndex: null,
    };
    setProgressState(updated);
    upsertPlan(userId, plan, updated).catch((err) =>
      console.error("Failed to save training progress:", err),
    );
  }, [userId, plan]);

  /** Remove the plan and its progress entirely. */
  const clearPlan = useCallback(() => {
    if (!userId) return;
    setPlanState(null);
    setProgressState(null);
    deletePlan(userId).catch((err) =>
      console.error("Failed to clear training plan:", err),
    );
  }, [userId]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  // Only use progress if it belongs to the current plan
  const validProgress         = progress?.planId === plan?.id ? progress : null;
  const lastCompletedDayIndex = validProgress?.lastCompletedDayIndex ?? null;
  const lastCompletedAt       = validProgress?.lastCompletedAt ?? null;
  const n = plan?.days.length ?? 0;
  const skippedToIndex =
    validProgress?.skippedToIndex != null && validProgress.skippedToIndex < n
      ? validProgress.skippedToIndex
      : null;

  const baseNextDayIndex =
    plan && n > 0
      ? lastCompletedDayIndex === null
        ? 0
        : (lastCompletedDayIndex + 1) % n
      : null;

  // Use the explicit skip override when present (and in-bounds); otherwise fall back to normal sequence.
  const nextDayIndex =
    plan && n > 0
      ? (skippedToIndex !== null ? skippedToIndex : baseNextDayIndex)
      : null;

  const nextDay          = plan && nextDayIndex !== null ? plan.days[nextDayIndex]                    : null;
  const lastCompletedDay = plan && lastCompletedDayIndex !== null ? plan.days[lastCompletedDayIndex] : null;

  /**
   * Advance the next-day pointer by +1 without completing a workout.
   * Safe to call multiple times; each call moves the pointer one further step.
   * Wraps around when the last unit is skipped.
   * No-op when the plan has only one day.
   */
  const skipCurrentDay = useCallback(() => {
    if (!userId || !plan || plan.days.length <= 1) return;
    // nextDayIndex already reflects any prior skip, so we advance from there.
    const current = nextDayIndex ?? 0;
    const newIndex = (current + 1) % plan.days.length;
    const updated: TrainingProgress = {
      planId: plan.id,
      lastCompletedDayIndex: validProgress?.lastCompletedDayIndex ?? null,
      lastCompletedAt: validProgress?.lastCompletedAt ?? null,
      skippedToIndex: newIndex,
    };
    setProgressState(updated);
    upsertPlan(userId, plan, updated).catch((err) =>
      console.error("Failed to save skip:", err),
    );
  }, [userId, plan, nextDayIndex, validProgress]);

  return {
    plan,
    nextDay,
    nextDayIndex,
    lastCompletedDay,
    lastCompletedAt,
    setPlan,
    markDayCompleted,
    skipCurrentDay,
    clearPlan,
  };
}
