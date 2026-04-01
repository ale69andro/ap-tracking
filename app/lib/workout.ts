import type { ExerciseSet, WorkoutSession, WorkoutHighlight } from "@/app/types";

export type PRRecord = { exerciseName: string; type: "e1rm" | "weight" };
import { calculate1RM } from "@/lib/analysis/calculate1RM";

/** Returns only working sets — excludes Warm-up type. Use for non-metric purposes (e.g. weight pre-fill). */
export function getWorkingSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.type !== "Warm-up");
}

/** Returns sets that count toward metrics: completed and not a warm-up. Single source of truth for all calculations. */
export function getEffectiveSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.completed === true && s.type !== "Warm-up");
}

/** Returns all completed sets regardless of type. Use for display in history views (warm-ups included). */
export function getCompletedSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.completed === true);
}

/** Sum of weight × reps across effective sets only (completed, non-warm-up). */
export function computeVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, e) =>
      total +
      getEffectiveSets(e.sets).reduce((s, set) => {
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps) || 0;
        return s + w * r;
      }, 0),
    0
  );
}

/** "45 min" / "1h 10m" / "—" */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "4,820 kg" / "—" */
export function formatVolume(kg: number): string {
  if (kg <= 0) return "—";
  return `${Math.round(kg).toLocaleString()} kg`;
}

/**
 * Finds the best set in a session using the Epley estimated 1RM formula:
 *   estimated1RM = weight × (1 + reps / 30)
 *
 * This correctly handles cases where a lighter but higher-rep set outscores
 * a heavier, lower-rep set. Returns null when no set has valid weight+reps.
 */
export function computeWorkoutHighlight(session: WorkoutSession): WorkoutHighlight | null {
  let best: WorkoutHighlight | null = null;
  let bestScore = 0;

  for (const exercise of session.exercises) {
    for (const set of getEffectiveSets(exercise.sets)) {
      const w = parseFloat(set.weight) || 0;
      const r = parseFloat(set.reps)   || 0;
      if (w <= 0 || r <= 0) continue;

      const e1rm = calculate1RM(w, r);
      if (e1rm > bestScore) {
        bestScore = e1rm;
        best = {
          exerciseName: exercise.exerciseName,
          weight:       w,
          reps:         r,
          estimated1RM: Math.round(e1rm * 10) / 10,
        };
      }
    }
  }

  return best;
}

/**
 * Computes average e1RM delta between this session and the most recent prior
 * session for each exercise. Returns null if no exercises have prior data.
 * priorHistory must be newest-first (i.e. history.slice(1) after saving).
 */
export function computeStrengthDelta(
  session: WorkoutSession,
  priorHistory: WorkoutSession[],
): number | null {
  const deltas: number[] = [];

  for (const ex of session.exercises) {
    const effectiveSets = getEffectiveSets(ex.sets);
    if (effectiveSets.length === 0) continue;

    const thisE1rm = effectiveSets.reduce((best, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseFloat(s.reps) || 0;
      return Math.max(best, calculate1RM(w, r));
    }, 0);
    if (thisE1rm === 0) continue;

    // Most recent prior session that contains this exercise
    const priorSession = priorHistory.find((w) =>
      w.exercises.some((e) => e.exerciseName === ex.exerciseName),
    );
    if (!priorSession) continue;

    const priorE1rm = priorSession.exercises
      .filter((e) => e.exerciseName === ex.exerciseName)
      .flatMap((e) => getEffectiveSets(e.sets))
      .reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseFloat(s.reps) || 0;
        return Math.max(best, calculate1RM(w, r));
      }, 0);
    if (priorE1rm === 0) continue;

    deltas.push((thisE1rm - priorE1rm) / priorE1rm);
  }

  if (deltas.length === 0) return null;
  return Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 100);
}
