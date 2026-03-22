"use client";

import { useState, useCallback, useEffect } from "react";
import type { TrainingPlan, TrainingProgress } from "@/app/types";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const planKey      = (uid: string) => `ap_training_plan_${uid}`;
const progressKey  = (uid: string) => `ap_training_progress_${uid}`;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function save<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainingPlan(userId: string | null) {
  const [plan,     setPlanState]     = useState<TrainingPlan | null>(null);
  const [progress, setProgressState] = useState<TrainingProgress | null>(null);

  // Load from localStorage when userId is available.
  // Deferred via Promise.resolve() to avoid synchronous setState-in-effect lint error.
  useEffect(() => {
    if (!userId) return;
    const planData      = load<TrainingPlan>(planKey(userId));
    const progressData  = load<TrainingProgress>(progressKey(userId));
    Promise.resolve().then(() => {
      setPlanState(planData);
      setProgressState(progressData);
    });
  }, [userId]);

  /** Persist a new or updated plan. Resets progress if the plan ID changed. */
  const setPlan = useCallback((newPlan: TrainingPlan) => {
    if (!userId) return;
    setPlanState(newPlan);
    save(planKey(userId), newPlan);

    setProgressState((prev) => {
      if (prev?.planId === newPlan.id) return prev;
      // New plan — start fresh progress
      const reset: TrainingProgress = {
        planId: newPlan.id,
        lastCompletedDayIndex: null,
        lastCompletedAt: null,
      };
      save(progressKey(userId), reset);
      return reset;
    });
  }, [userId]);

  /** Mark a day (by 0-based index) as the most recently completed. */
  const markDayCompleted = useCallback((dayIndex: number) => {
    if (!userId || !plan) return;
    const updated: TrainingProgress = {
      planId: plan.id,
      lastCompletedDayIndex: dayIndex,
      lastCompletedAt: Date.now(),
    };
    setProgressState(updated);
    save(progressKey(userId), updated);
  }, [userId, plan]);

  /** Remove the plan and its progress entirely. */
  const clearPlan = useCallback(() => {
    if (!userId) return;
    setPlanState(null);
    setProgressState(null);
    localStorage.removeItem(planKey(userId));
    localStorage.removeItem(progressKey(userId));
  }, [userId]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  // Only use progress if it belongs to the current plan
  const validProgress = progress?.planId === plan?.id ? progress : null;
  const lastCompletedDayIndex = validProgress?.lastCompletedDayIndex ?? null;
  const lastCompletedAt       = validProgress?.lastCompletedAt ?? null;

  const nextDayIndex =
    plan && plan.days.length > 0
      ? lastCompletedDayIndex === null
        ? 0
        : (lastCompletedDayIndex + 1) % plan.days.length
      : null;

  const nextDay          = plan && nextDayIndex !== null ? plan.days[nextDayIndex]          : null;
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
