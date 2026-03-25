import type { ExerciseSession, ExerciseTrend, NextTarget } from "@/app/types";

/** Standard smallest plate increment (kg). */
const PLATE = 2.5;

/**
 * Counts how many trailing sessions have the same topWeight AND topReps as the
 * most recent session. Used to distinguish brief plateau from deep stagnation.
 */
export function countFlatSessions(sessions: ExerciseSession[]): number {
  if (sessions.length < 2) return 1;
  const last = sessions[sessions.length - 1];
  let count = 1;
  for (let i = sessions.length - 2; i >= 0; i--) {
    const s = sessions[i];
    if (Math.abs(s.topWeight - last.topWeight) < 0.01 && s.topReps === last.topReps) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Computes a concrete next-session target based on the exercise's trend and
 * recent session data.
 *
 * Priority:
 *  - up   → add one plate increment, maintain rep range
 *  - flat → if stagnant for 3+ sessions push weight; otherwise push reps first
 *  - down → reduce weight slightly, maintain reps
 *  - none → echo last session, no specific push yet
 *
 * Returns null when there is no usable history (no weight/reps recorded).
 */
export function computeNextTarget(
  sessions: ExerciseSession[],
  trend: ExerciseTrend,
): NextTarget | null {
  if (sessions.length === 0) return null;

  const last = sessions[sessions.length - 1];
  const w = last.topWeight;
  const r = last.topReps;
  if (w <= 0 || r <= 0) return null;

  if (trend === "up") {
    return {
      weight:   w + PLATE,
      repsMin:  Math.max(r - 2, 1),
      repsMax:  r,
      note:     "Progressing — add weight",
    };
  }

  if (trend === "flat") {
    const flat = countFlatSessions(sessions);
    if (flat >= 3) {
      // Deep stagnation — bump the weight; allow at most 1 rep drop so low-rep
      // lifts (e.g. 3 reps) don't get a range like 1–3.
      return {
        weight:  w + PLATE,
        repsMin: Math.max(r - 1, 1),
        repsMax: r,
        note:    `Stagnant ${flat} sessions — try more weight`,
      };
    }
    // Short plateau — squeeze out more reps first
    return {
      weight:  w,
      repsMin: r,
      repsMax: r + 2,
      note:    "Plateau — push for more reps",
    };
  }

  if (trend === "down") {
    const reduced = Math.max(+(w - PLATE).toFixed(2), PLATE);
    return {
      weight:  reduced,
      repsMin: r,
      repsMax: r,
      note:    "Declining — reduce load, focus on form",
    };
  }

  if (trend === "mixed") {
    // Inconsistent results — repeat load, aim for more reps
    return {
      weight:  w,
      repsMin: r,
      repsMax: r + 2,
      note:    "Mixed results — hold load, push for more reps",
    };
  }

  // "none" — not enough sessions for a trend yet
  return {
    weight:  w,
    repsMin: r,
    repsMax: r,
    note:    "Keep logging to unlock recommendations",
  };
}
