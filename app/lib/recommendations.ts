import type { Equipment, ExerciseSession, ExerciseTrend, NextTarget } from "@/app/types";

/** Standard smallest plate increment (kg). */
const PLATE = 2.5;

/** Per-equipment default load increment (kg). */
const EQUIPMENT_INCREMENTS: Record<Equipment, number> = {
  Barbell:    2.5,
  "EZ Bar":   2.5,
  Smith:      2.5,
  Dumbbell:   2.0,
  Kettlebell: 4.0,
  Cable:      2.5,
  Machine:    2.5,
  Bodyweight: 0,
};

/** Returns the appropriate load increment for the given equipment type. */
export function getIncrement(equipment: Equipment): number {
  return EQUIPMENT_INCREMENTS[equipment];
}

interface DoubleProgressionOptions {
  repRangeMin: number;
  repRangeMax: number;
  increment:   number;
}

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
 * When `options` is provided (repRangeMin, repRangeMax, increment), double
 * progression logic takes priority over trend-based logic:
 *   - reps < repRangeMax → same weight, +1 rep
 *   - reps >= repRangeMax → +increment kg, reset to repRangeMin
 *
 * Trend-based fallback priority (when no options):
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
  options?: DoubleProgressionOptions,
): NextTarget | null {
  if (sessions.length === 0) return null;

  const last = sessions[sessions.length - 1];
  const w = last.topWeight;
  const r = last.topReps;
  if (w <= 0 || r <= 0) return null;

  // ── Double Progression ───────────────────────────────────────────────────────
  if (
    options !== undefined &&
    options.repRangeMin > 0 &&
    options.repRangeMax > options.repRangeMin
  ) {
    if (r < options.repRangeMax) {
      // Still room in the rep range — push reps, hold weight
      return {
        weight:  w,
        repsMin: r + 1,
        repsMax: r + 1,
        note:    "Same weight — add 1 rep",
      };
    } else {
      // Hit or exceeded the ceiling — add increment, soft-reset reps.
      //
      // Hard reset to repRangeMin is correct for narrow ranges (e.g. 6–8, drop 2)
      // but produces absurd output for wide ranges (e.g. 6–20, drop 14).
      // Instead, drop at most SOFT_DROP reps from the last set, floored at
      // repRangeMin. For narrow ranges the floor dominates and nothing changes;
      // for wide ranges the collapse is capped at a coach-logical level.
      //
      // 70 × 8  (range 6–8)  → max(6, 8-4)  = 6  → 72.5 × 6  (unchanged)
      // 70 × 10 (range 6–10) → max(6, 10-4) = 6  → 72.5 × 6  (unchanged)
      // 70 × 20 (range 6–20) → max(6, 20-4) = 16 → 72.5 × 16 (fixed)
      const inc = options.increment > 0 ? options.increment : PLATE;
      const SOFT_DROP = 4;
      const resetReps = Math.max(options.repRangeMin, r - SOFT_DROP);
      return {
        weight:  +(w + inc).toFixed(2),
        repsMin: resetReps,
        repsMax: resetReps,
        note:    `+${inc} kg — reset to ${resetReps} reps`,
      };
    }
  }

  // ── Trend-based fallback ─────────────────────────────────────────────────────
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
