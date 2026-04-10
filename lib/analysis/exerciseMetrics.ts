import type { ExerciseSet, WorkoutSession, ExerciseSession } from "@/app/types";
import { calculate1RM } from "@/lib/analysis/calculate1RM";
import { getSessionDate } from "@/app/lib/dateUtils";

/**
 * Returns only completed working sets (excludes warm-ups, incomplete sets,
 * and sets missing weight/reps). These are the only sets used for analysis.
 */
export function getRelevantWorkingSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter(
    (s) =>
      s.completed &&
      s.type !== "Warm-up" &&
      s.weight !== "" &&
      s.reps !== "" &&
      parseFloat(s.weight) > 0 &&
      parseFloat(s.reps) > 0,
  );
}

/**
 * Returns the "top set" — highest weight; tie-break by most reps.
 */
export function getTopSet(sets: ExerciseSet[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const s of sets) {
    const w = parseFloat(s.weight) || 0;
    const r = parseFloat(s.reps) || 0;
    if (w <= 0 || r <= 0) continue;
    if (!best || w > best.weight || (w === best.weight && r > best.reps)) {
      best = { weight: w, reps: r };
    }
  }
  return best;
}

/**
 * Calculates total volume (sum of weight × reps) for the given sets.
 */
export function calculateSessionVolume(sets: ExerciseSet[]): number {
  return sets.reduce((sum, s) => {
    const w = parseFloat(s.weight) || 0;
    const r = parseFloat(s.reps) || 0;
    return sum + w * r;
  }, 0);
}

/**
 * Epley 1RM formula (delegates to shared calculate1RM).
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  return calculate1RM(weight, reps);
}

/**
 * Extracts chronological ExerciseSessions for one exercise from the full
 * workout history. Only processes completed sessions. History is expected
 * newest-first (standard app storage order).
 */
export function getExerciseSessionsFromHistory(
  workouts: WorkoutSession[],
  exerciseName: string,
): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];

  // Iterate oldest-first for chronological output
  [...workouts].reverse().forEach((workout) => {
    if (workout.status !== "completed") return;
    const exercise = workout.exercises.find(
      (e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (!exercise) return;

    const workingSets = getRelevantWorkingSets(exercise.sets);
    if (workingSets.length === 0) return;

    const topSet = getTopSet(workingSets);
    if (!topSet) return;

    const totalVolume = calculateSessionVolume(workingSets);
    const score = calculateEpley1RM(topSet.weight, topSet.reps);
    const date = getSessionDate(workout);

    sessions.push({
      date,
      topWeight: topSet.weight,
      topReps: topSet.reps,
      totalVolume,
      score,
      setCount: workingSets.length,
    });
  });

  return sessions;
}
