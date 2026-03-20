import type { WorkoutSession, ExerciseSet } from "@/app/types";

// Demo workout dates, newest-first (matching real history convention)
const DATES = [
  "2026-03-15", "2026-03-01", "2026-02-15", "2026-02-01",
  "2026-01-18", "2026-01-04", "2025-12-21", "2025-12-07",
];

let _n = 0;
const uid = () => `demo_${++_n}`;

function mkSets(weights: number[], reps: number): ExerciseSet[] {
  return weights.map((w) => ({
    id:          uid(),
    weight:      String(w),
    reps:        String(reps),
    type:        "Normal" as const,
    restSeconds: 180,
    completed:   true,
  }));
}

// sessions[0] = newest (index 0 = DATES[0] = 2026-03-15)
const EXERCISES: {
  exerciseName: string;
  muscleGroups: string[];
  sessions: [number[], number][];  // [weights, reps]
}[] = [
  {
    exerciseName: "Bench Press",
    muscleGroups: ["Chest", "Triceps"],
    sessions: [
      [[80, 80, 77.5], 8], [[77.5, 77.5, 75], 8], [[75, 75, 72.5], 8], [[72.5, 72.5, 70], 8],
      [[70, 70, 67.5], 8], [[67.5, 67.5, 65], 8], [[65, 65, 62.5], 8], [[60, 60, 57.5], 8],
    ],
  },
  {
    exerciseName: "Squat",
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    sessions: [
      [[110, 110, 107.5], 5], [[107.5, 107.5, 105], 5], [[105, 105, 102.5], 5], [[100, 100, 97.5], 5],
      [[95, 95, 92.5], 5],   [[90, 90, 87.5], 5],       [[85, 85, 82.5], 5],   [[80, 80, 77.5], 5],
    ],
  },
  {
    exerciseName: "Deadlift",
    muscleGroups: ["Back", "Hamstrings", "Glutes"],
    sessions: [
      [[135, 132.5], 5], [[132.5, 130], 5], [[130, 127.5], 5], [[125, 122.5], 5],
      [[120, 117.5], 5], [[115, 112.5], 5], [[110, 107.5], 5], [[100, 100], 5],
    ],
  },
  {
    exerciseName: "Overhead Press",
    muscleGroups: ["Shoulders", "Triceps"],
    sessions: [
      [[50, 47.5, 47.5], 8], [[47.5, 47.5, 47.5], 8], [[47.5, 47.5, 45], 8], [[47.5, 47.5, 45], 8],
      [[45, 45, 45], 8],     [[45, 45, 42.5], 8],      [[42.5, 42.5, 40], 8], [[40, 40, 37.5], 8],
    ],
  },
  {
    exerciseName: "Barbell Row",
    muscleGroups: ["Back", "Biceps"],
    sessions: [
      [[67.5, 65, 65], 8], [[67.5, 67.5, 65], 8], [[67.5, 67.5, 65], 8], [[70, 70, 67.5], 8],
      [[72.5, 72.5, 70], 8], [[75, 75, 72.5], 8], [[72.5, 72.5, 70], 8], [[70, 70, 67.5], 8],
    ],
  },
];

export const DEMO_WORKOUTS: WorkoutSession[] = DATES.map((dateStr, i) => {
  const startedAt = new Date(dateStr + "T10:00:00").getTime();
  return {
    id:         uid(),
    name:       "Demo Workout",
    startedAt,
    durationSeconds: 3600,
    exercises:  EXERCISES.map((ex) => ({
      id:           uid(),
      exerciseName: ex.exerciseName,
      muscleGroups: ex.muscleGroups,
      sets:         mkSets(ex.sessions[i][0], ex.sessions[i][1]),
    })),
  };
});
