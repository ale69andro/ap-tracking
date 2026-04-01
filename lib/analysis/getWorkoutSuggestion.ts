import type { SessionExercise, WorkoutSuggestion } from "@/app/types";

function floorTo2_5(value: number): number {
  return Math.floor(value / 2.5) * 2.5;
}

export function getExerciseSuggestion(exercise: SessionExercise): WorkoutSuggestion | null {
  // Collect completed non-warm-up sets with valid numeric weight and reps
  const workingSets = exercise.sets.filter(
    (s) =>
      s.completed &&
      s.type !== "Warm-up" &&
      parseFloat(s.weight) > 0 &&
      parseInt(s.reps, 10) > 0
  );

  if (workingSets.length < 2) return null;

  // Stable sort: use completedAt if all sets have it, otherwise preserve array order
  const allHaveTimestamp = workingSets.every((s) => s.completedAt != null);
  const sorted = allHaveTimestamp
    ? [...workingSets].sort((a, b) => a.completedAt! - b.completedAt!)
    : workingSets;

  const prev = sorted[sorted.length - 2];
  const last = sorted[sorted.length - 1];

  const prevWeight = parseFloat(prev.weight);
  const lastWeight = parseFloat(last.weight);
  const prevReps = parseInt(prev.reps, 10);
  const lastReps = parseInt(last.reps, 10);

  // Trigger: same weight, reps dropped
  if (prevWeight !== lastWeight || lastReps >= prevReps) return null;

  const reduced = floorTo2_5(lastWeight * 0.96);

  if (reduced >= 5 && reduced < lastWeight) {
    return {
      type: "next_set",
      title: `Try ${reduced} kg next set`,
      detail: "Reps dropped — reduce load to keep quality high",
    };
  }

  return {
    type: "next_set",
    title: "Reduce load slightly next set",
    detail: "Reps dropped at the same weight",
  };
}
