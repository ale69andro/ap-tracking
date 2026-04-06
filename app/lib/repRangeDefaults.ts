import { findBuiltIn } from "@/app/constants/exercises";
import type { BuiltInExercise } from "@/app/types";

// ─── Bucket classification ────────────────────────────────────────────────────
//
// Maps an exercise to one of 7 mutually exclusive buckets.
// All equipment/movement logic lives here — nothing in the table or the
// public function needs to know about equipment directly.

type RepBucket =
  | "barbell_compound"   // Barbell compound Squat / Hinge / Press; Smith compound
  | "barbell_accessory"  // Barbell compound Row; all barbell isolation; EZ Bar
  | "dumbbell_kettlebell"
  | "cable_machine"      // Cable; Machine non-isolation; Smith non-compound
  | "isolation_calves"   // Machine isolation; any Calves exercise
  | "bodyweight"
  | "fallback";          // Custom / exercise not in library

function classifyBucket(exercise: BuiltInExercise): RepBucket {
  const isIsolation = exercise.coachTags.includes("isolation");
  const isCompound  = exercise.coachTags.includes("compound");

  // Machine isolation or any Calves exercise → isolation_calves
  if (
    exercise.primaryMuscleGroups.includes("Calves") ||
    (exercise.equipment === "Machine" && isIsolation)
  ) {
    return "isolation_calves";
  }

  // Barbell compound Squat / Hinge / Press
  if (
    exercise.equipment === "Barbell" &&
    isCompound &&
    (exercise.movementType === "Squat" ||
      exercise.movementType === "Hinge" ||
      exercise.movementType === "Press")
  ) {
    return "barbell_compound";
  }

  // Smith compound (not free-bar → one tier below barbell compound)
  if (exercise.equipment === "Smith" && isCompound) {
    return "barbell_compound";
  }

  // All other Barbell (compound Row, isolation like Curl / Skull Crusher)
  // EZ Bar is accessory-tier by convention
  if (exercise.equipment === "Barbell" || exercise.equipment === "EZ Bar") {
    return "barbell_accessory";
  }

  if (exercise.equipment === "Dumbbell" || exercise.equipment === "Kettlebell") {
    return "dumbbell_kettlebell";
  }

  // Cable / non-isolation Machine / non-compound Smith
  if (
    exercise.equipment === "Cable" ||
    exercise.equipment === "Machine" ||
    exercise.equipment === "Smith"
  ) {
    return "cable_machine";
  }

  if (exercise.equipment === "Bodyweight") {
    return "bodyweight";
  }

  return "fallback";
}

// ─── Rep range table ──────────────────────────────────────────────────────────
//
// One row per experience level, one column per bucket.
// Bodyweight mirrors dumbbell_kettlebell at every level.
// EZ Bar and Smith compound are folded into their nearest named bucket above.

type Experience = "beginner" | "intermediate" | "advanced";

const REP_RANGES: Record<Experience, Record<RepBucket, { min: number; max: number }>> = {
  beginner: {
    barbell_compound:    { min: 5,  max: 8  },
    barbell_accessory:   { min: 8,  max: 12 },
    dumbbell_kettlebell: { min: 10, max: 15 },
    cable_machine:       { min: 12, max: 15 },
    isolation_calves:    { min: 15, max: 20 },
    bodyweight:          { min: 10, max: 15 },
    fallback:            { min: 10, max: 12 },
  },
  intermediate: {
    barbell_compound:    { min: 4,  max: 6  },
    barbell_accessory:   { min: 6,  max: 10 }, // EZ Bar intermediate explicitly 8–12 handled via bucket
    dumbbell_kettlebell: { min: 8,  max: 12 },
    cable_machine:       { min: 10, max: 15 },
    isolation_calves:    { min: 12, max: 20 },
    bodyweight:          { min: 8,  max: 12 },
    fallback:            { min: 8,  max: 12 },
  },
  advanced: {
    barbell_compound:    { min: 3,  max: 5  },
    barbell_accessory:   { min: 5,  max: 8  },
    dumbbell_kettlebell: { min: 6,  max: 10 },
    cable_machine:       { min: 8,  max: 12 },
    isolation_calves:    { min: 10, max: 15 },
    bodyweight:          { min: 6,  max: 10 },
    fallback:            { min: 6,  max: 10 },
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the default rep range for an exercise, adjusted for the user's
 * experience level. Falls back to "intermediate" when experience is undefined
 * (e.g. profile not yet loaded).
 *
 * Custom exercises not in the built-in library return the fallback range for
 * the given experience level.
 */
export function getDefaultRepRange(
  exerciseName: string,
  experience: Experience = "intermediate",
): { min: number; max: number } {
  const exercise = findBuiltIn(exerciseName);
  if (!exercise) return REP_RANGES[experience].fallback;
  return REP_RANGES[experience][classifyBucket(exercise)];
}
