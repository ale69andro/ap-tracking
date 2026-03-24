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

  /** Mark a day (by 0-based index) as the most recently completed. */
  const markDayCompleted = useCallback((dayIndex: number) => {
    if (!userId || !plan) return;
    const updated: TrainingProgress = {
      planId: plan.id,
      lastCompletedDayIndex: dayIndex,
      lastCompletedAt: Date.now(),
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

  const nextDayIndex =
    plan && plan.days.length > 0
      ? lastCompletedDayIndex === null
        ? 0
        : (lastCompletedDayIndex + 1) % plan.days.length
      : null;

  const nextDay          = plan && nextDayIndex !== null ? plan.days[nextDayIndex]                    : null;
  const lastCompletedDay = plan && lastCompletedDayIndex !== null ? plan.days[lastCompletedDayIndex] : null;

  return {
    plan,
    nextDay,
    nextDayIndex,
    lastCompletedDay,
    lastCompletedAt,
    setPlan,
    markDayCompleted,
    clearPlan,
  };
}
