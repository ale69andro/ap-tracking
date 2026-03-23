import { LIBRARY } from "@/app/constants/exercises";
import type { BuiltInExercise } from "@/app/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseAlternative = {
  name: string;
  reason: string;
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
//
// Hard filter: candidate must share at least one primaryMuscleGroup with source.
//
// Score:
//   +3  same movementType  — same pattern is the strongest signal
//   +2  different equipment — we're looking for alternatives, not duplicates
//   +0.5 per overlapping secondaryMuscleGroup — tiebreaker
//
// Quality gate: score must be > 2 (a weak muscle overlap alone isn't enough).
// Returns top 3 by score, LIBRARY order used as stable tiebreaker.

function score(source: BuiltInExercise, candidate: BuiltInExercise): number {
  let s = 0;
  if (candidate.movementType === source.movementType) s += 3;
  if (candidate.equipment !== source.equipment) s += 2;
  for (const m of candidate.secondaryMuscleGroups) {
    if (source.secondaryMuscleGroups.includes(m)) s += 0.5;
  }
  return s;
}

function reason(source: BuiltInExercise, candidate: BuiltInExercise): string {
  const samePattern = candidate.movementType === source.movementType;
  const sameEquip   = candidate.equipment === source.equipment;
  const movement    = source.movementType.toLowerCase();

  if (samePattern && !sameEquip) return `Same ${movement} pattern, different equipment`;
  if (samePattern &&  sameEquip) return `Same movement, similar target`;
  return `Same muscle target, different approach`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getExerciseAlternatives(exercise: BuiltInExercise): ExerciseAlternative[] {
  const scored: Array<{ ex: BuiltInExercise; s: number; idx: number }> = [];

  LIBRARY.forEach((candidate, idx) => {
    if (candidate.id === exercise.id) return;

    const hasOverlap = candidate.primaryMuscleGroups.some((m) =>
      exercise.primaryMuscleGroups.includes(m),
    );
    if (!hasOverlap) return;

    const s = score(exercise, candidate);
    if (s <= 2) return;

    scored.push({ ex: candidate, s, idx });
  });

  scored.sort((a, b) => b.s - a.s || a.idx - b.idx);

  return scored.slice(0, 3).map(({ ex }) => ({
    name: ex.name,
    reason: reason(exercise, ex),
  }));
}
