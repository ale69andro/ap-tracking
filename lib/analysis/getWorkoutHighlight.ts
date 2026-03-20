import { calculate1RM } from "./calculate1RM";

type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
};

type WorkoutHighlight = {
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
} | null;

export function getWorkoutHighlight(sets: WorkoutSet[]): WorkoutHighlight {
  if (!sets || sets.length === 0) {
    return null;
  }

  let bestSet: WorkoutHighlight = null;
  let bestEstimated1RM = 0;

  for (const set of sets) {
    const estimated1RM = calculate1RM(set.weight, set.reps);

    if (estimated1RM > bestEstimated1RM) {
      bestEstimated1RM = estimated1RM;
      bestSet = {
        exerciseName: set.exerciseName,
        weight: set.weight,
        reps: set.reps,
        estimated1RM,
      };
    }
  }

  return bestSet;
}