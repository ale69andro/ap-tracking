"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrainingPlan, TrainingProgress } from "@/app/types";

// ─── localStorage helpers (one-time migration read + cleanup only) ────────────

const planKey     = (uid: string) => `ap_training_plan_${uid}`;
const progressKey = (uid: string) => `ap_training_progress_${uid}`;

function loadLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function removeLocal(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

/** Throws on error so callers can gate side-effects (e.g. localStorage cleanup)
 *  on confirmed persistence. */
async function upsertPlanToSupabase(
  userId: string,
  plan: TrainingPlan | null,
  progress: TrainingProgress | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { id: userId, training_plan: plan, training_progress: progress },
      { onConflict: "id" },
    );
  if (error) throw error;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainingPlan(userId: string | null) {
  const [plan,     setPlanState]     = useState<TrainingPlan | null>(null);
  const [progress, setProgressState] = useState<TrainingProgress | null>(null);

  // Guards the one-time localStorage → Supabase migration so it runs at most
  // once per session. Mirrors the migrationAttempted pattern in useTemplates.
  const migrationAttempted = useRef(false);

  // Load from Supabase on mount / userId change.
  // If Supabase SELECT fails transiently, show any local plan as a graceful
  // fallback without treating it as source of truth (migration will retry on
  // the next successful load).
  // If Supabase returns no plan, attempt a one-time migration from localStorage.
  // localStorage keys are only removed after a confirmed successful upsert.
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from("user_profiles")
      .select("training_plan, training_progress")
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          console.error("Failed to load training plan:", {
            message: error.message,
            code:    error.code,
            details: error.details,
            hint:    error.hint,
          });
          // Transient failure — show local plan if available so the UI isn't
          // blank. migrationAttempted stays false so migration retries next
          // time a SELECT succeeds.
          const localPlan     = loadLocal<TrainingPlan>(planKey(userId));
          const localProgress = loadLocal<TrainingProgress>(progressKey(userId));
          if (localPlan !== null) {
            setPlanState(localPlan);
            setProgressState(localProgress);
          }
          return;
        }

        const remotePlan     = (data?.training_plan     as TrainingPlan     | null) ?? null;
        const remoteProgress = (data?.training_progress as TrainingProgress | null) ?? null;

        if (remotePlan !== null) {
          // Supabase has a plan — use it as source of truth.
          setPlanState(remotePlan);
          setProgressState(remoteProgress);
          return;
        }

        // Supabase has no plan yet. Attempt one-time migration from localStorage.
        if (!migrationAttempted.current) {
          migrationAttempted.current = true;

          const localPlan     = loadLocal<TrainingPlan>(planKey(userId));
          const localProgress = loadLocal<TrainingProgress>(progressKey(userId));

          if (localPlan !== null) {
            try {
              await upsertPlanToSupabase(userId, localPlan, localProgress);
              // Only clear localStorage after confirmed persistence.
              removeLocal(planKey(userId));
              removeLocal(progressKey(userId));
            } catch (err) {
              console.error("TrainingPlan migration failed:", err);
              // localStorage keys are intentionally preserved so migration can
              // retry on the next successful load.
            }
          }

          setPlanState(localPlan);
          setProgressState(localProgress);
        }
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
    upsertPlanToSupabase(userId, newPlan, nextProgress).catch((err) =>
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
    upsertPlanToSupabase(userId, plan, updated).catch((err) =>
      console.error("Failed to save training progress:", err),
    );
  }, [userId, plan]);

  /** Remove the plan and its progress entirely. */
  const clearPlan = useCallback(() => {
    if (!userId) return;
    setPlanState(null);
    setProgressState(null);
    upsertPlanToSupabase(userId, null, null).catch((err) =>
      console.error("Failed to clear training plan:", err),
    );
    // Clean up any remaining legacy localStorage keys.
    removeLocal(planKey(userId));
    removeLocal(progressKey(userId));
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
