import type { WorkoutSession, WorkoutHighlight } from "@/app/types";
import { calculate1RM } from "@/lib/analysis/calculate1RM";

/** Sum of weight × reps across all sets in a session. */
export function computeVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, e) =>
      total +
      e.sets.reduce((s, set) => {
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
    for (const set of exercise.sets) {
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
