import type { ExerciseSet, WorkoutSession, TrainingProfile } from "@/app/types";
import { calculate1RM } from "@/lib/analysis/calculate1RM";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadDaySeverity   = "none" | "mild" | "moderate" | "severe";
export type BadDaySuggestion = "continue_as_planned" | "reduce_load" | "reduce_sets" | "technique_focus";

export type BadDaySignal = {
  detected:    boolean;
  severity:    BadDaySeverity;
  reason?:     string;
  suggestions?: BadDaySuggestion[];
};

type DetectInput = {
  currentExerciseName: string;
  /** All sets for the exercise in the current session (warm-ups will be ignored). */
  currentSets:         ExerciseSet[];
  /** Completed sessions, newest-first (standard history order from useWorkout). */
  recentSessions:      WorkoutSession[];
  trainingProfile?:    TrainingProfile;
  recoveryTier?:       "low" | "medium" | "high";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BASELINE_SESSIONS = 3; // max historical sessions to average for baseline
const MIN_HISTORY       = 2; // need at least this many baseline data points

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Best e1RM from completed non-warm-up sets with valid weight and reps. */
function bestE1RM(sets: ExerciseSet[]): number {
  let best = 0;
  for (const s of sets) {
    if (s.type === "Warm-up") continue;
    const w = parseFloat(s.weight);
    const r = parseFloat(s.reps);
    if (w > 0 && r > 0) best = Math.max(best, calculate1RM(w, r));
  }
  return best;
}

// ─── Main export ──────────────────────────────────────────────────────────────

const NOT_DETECTED: BadDaySignal = { detected: false, severity: "none" };

/**
 * Compares today's completed working sets against a recent e1RM baseline.
 * Returns a signal describing how far below baseline today's performance is.
 *
 * - Only fires after at least one working set is completed today.
 * - Needs ≥2 historical sessions to establish a baseline.
 * - Low recoveryTier slightly lowers thresholds (more sensitive).
 * - Never mutates state or changes the plan.
 */
export function detectBadDayDuringWorkout({
  currentExerciseName,
  currentSets,
  recentSessions,
  recoveryTier,
}: DetectInput): BadDaySignal {
  // Must have at least one completed working set to evaluate
  const completedWorking = currentSets.filter(
    (s) => s.completed && s.type !== "Warm-up",
  );
  if (completedWorking.length === 0) return NOT_DETECTED;

  // Build baseline from the last BASELINE_SESSIONS sessions containing this exercise
  const historicalE1RMs: number[] = [];
  for (const session of recentSessions) {
    if (historicalE1RMs.length >= BASELINE_SESSIONS) break;
    const exercise = session.exercises.find(
      (e) => e.exerciseName === currentExerciseName,
    );
    if (!exercise) continue;
    const e1rm = bestE1RM(exercise.sets);
    if (e1rm > 0) historicalE1RMs.push(e1rm);
  }

  if (historicalE1RMs.length < MIN_HISTORY) return NOT_DETECTED;

  const baseline = historicalE1RMs.reduce((s, v) => s + v, 0) / historicalE1RMs.length;
  const todayBest = bestE1RM(completedWorking);

  if (todayBest === 0 || baseline === 0) return NOT_DETECTED;

  const drop = (baseline - todayBest) / baseline;
  if (drop <= 0) return NOT_DETECTED; // equal or better than baseline

  // Low recovery lowers detection thresholds slightly (more vigilant)
  const isLowRecovery     = recoveryTier === "low";
  const mildThreshold     = isLowRecovery ? 0.04 : 0.05;
  const moderateThreshold = isLowRecovery ? 0.07 : 0.08;
  const severeThreshold   = isLowRecovery ? 0.10 : 0.12;

  const pct = Math.round(drop * 100);

  if (drop < mildThreshold) return NOT_DETECTED;

  if (drop < moderateThreshold) {
    return {
      detected:    true,
      severity:    "mild",
      reason:      `Today's best effort is ${pct}% below your recent baseline — slightly off but nothing major`,
      suggestions: ["continue_as_planned", "technique_focus"],
    };
  }

  if (drop < severeThreshold) {
    return {
      detected:    true,
      severity:    "moderate",
      reason:      `Today's best effort is ${pct}% below your recent baseline — consider adjusting`,
      suggestions: ["continue_as_planned", "reduce_load", "technique_focus"],
    };
  }

  return {
    detected:    true,
    severity:    "severe",
    reason:      `Today's best effort is ${pct}% below your recent baseline — significantly off today`,
    suggestions: ["continue_as_planned", "reduce_load", "reduce_sets"],
  };
}
