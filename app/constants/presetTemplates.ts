import type { WorkoutTemplate } from "@/app/types";

// ─── Built-in Preset Templates ────────────────────────────────────────────────
//
// These are protected defaults. They are never stored in localStorage.
// Users can start a workout directly from a preset, or "customize" it to
// create their own editable copy saved under My Templates.
//
// IDs use the "preset-" prefix to make origin clear during debugging.
// sets/targetReps/restSeconds are pre-configured with sensible gym defaults.
//
// targetRepsMin / targetRepsMax are derived from getDefaultRepRange() buckets:
//   Barbell compound Squat/Hinge/Press → 3–6
//   Barbell other (Row, Curl, etc.)    → 6–10
//   EZ Bar / Dumbbell / Kettlebell     → 8–12
//   Cable / Machine compound           → 10–15
//   Machine isolation                  → 12–20
//   Calves                             → 12–20
//   Bodyweight                         → 8–15

export const PRESET_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "preset-push",
    name: "Push",
    exercises: [
      { name: "Bench Press",               muscleGroups: ["Chest", "Triceps", "Front Delts"],       sets: 4, targetReps: 8,  restSeconds: 120, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Incline Dumbbell Press",    muscleGroups: ["Upper Chest", "Triceps", "Front Delts"], sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 8,  targetRepsMax: 12 },
      { name: "Dumbbell Shoulder Press",   muscleGroups: ["Shoulders", "Triceps"],                  sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 8,  targetRepsMax: 12 },
      { name: "Lateral Raise",             muscleGroups: ["Side Delts"],                            sets: 3, targetReps: 15, restSeconds: 60,  targetRepsMin: 8,  targetRepsMax: 12 },
      { name: "Tricep Pushdown",           muscleGroups: ["Triceps"],                               sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Overhead Tricep Extension", muscleGroups: ["Triceps"],                               sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 8,  targetRepsMax: 12 },
    ],
  },
  {
    id: "preset-pull",
    name: "Pull",
    exercises: [
      { name: "Barbell Row",      muscleGroups: ["Back", "Rear Delts", "Biceps"],  sets: 4, targetReps: 8,  restSeconds: 120, targetRepsMin: 6,  targetRepsMax: 10 },
      { name: "Lat Pulldown",     muscleGroups: ["Lats", "Biceps"],                sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Seated Cable Row", muscleGroups: ["Back", "Biceps"],                sets: 3, targetReps: 12, restSeconds: 90,  targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Face Pull",        muscleGroups: ["Rear Delts", "Upper Back"],      sets: 3, targetReps: 15, restSeconds: 60,  targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Barbell Curl",     muscleGroups: ["Biceps"],                        sets: 3, targetReps: 10, restSeconds: 60,  targetRepsMin: 6,  targetRepsMax: 10 },
      { name: "Hammer Curl",      muscleGroups: ["Biceps", "Forearms"],            sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 8,  targetRepsMax: 12 },
    ],
  },
  {
    id: "preset-legs",
    name: "Legs",
    exercises: [
      { name: "Squat",             muscleGroups: ["Quads", "Glutes"],      sets: 4, targetReps: 8,  restSeconds: 180, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Leg Press",         muscleGroups: ["Quads", "Glutes"],      sets: 3, targetReps: 10, restSeconds: 120, targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Romanian Deadlift", muscleGroups: ["Hamstrings", "Glutes"], sets: 3, targetReps: 10, restSeconds: 120, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Leg Curl",          muscleGroups: ["Hamstrings"],           sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
      { name: "Leg Extension",     muscleGroups: ["Quads"],                sets: 3, targetReps: 15, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
      { name: "Calf Raise",        muscleGroups: ["Calves"],               sets: 4, targetReps: 15, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
    ],
  },
  {
    id: "preset-upper",
    name: "Upper Body",
    exercises: [
      { name: "Bench Press",     muscleGroups: ["Chest", "Triceps", "Front Delts"], sets: 4, targetReps: 8,  restSeconds: 120, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Barbell Row",     muscleGroups: ["Back", "Rear Delts", "Biceps"],    sets: 4, targetReps: 8,  restSeconds: 120, targetRepsMin: 6,  targetRepsMax: 10 },
      { name: "Shoulder Press",  muscleGroups: ["Shoulders", "Triceps"],            sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Lat Pulldown",    muscleGroups: ["Lats", "Biceps"],                  sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 10, targetRepsMax: 15 },
      { name: "Lateral Raise",   muscleGroups: ["Side Delts"],                      sets: 3, targetReps: 15, restSeconds: 60,  targetRepsMin: 8,  targetRepsMax: 12 },
      { name: "Barbell Curl",    muscleGroups: ["Biceps"],                          sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 6,  targetRepsMax: 10 },
      { name: "Tricep Pushdown", muscleGroups: ["Triceps"],                         sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
  {
    id: "preset-lower",
    name: "Lower Body",
    exercises: [
      { name: "Squat",             muscleGroups: ["Quads", "Glutes"],      sets: 4, targetReps: 8,  restSeconds: 180, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Romanian Deadlift", muscleGroups: ["Hamstrings", "Glutes"], sets: 3, targetReps: 10, restSeconds: 120, targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Hip Thrust",        muscleGroups: ["Glutes"],               sets: 3, targetReps: 12, restSeconds: 90,  targetRepsMin: 3,  targetRepsMax: 6  },
      { name: "Leg Curl",          muscleGroups: ["Hamstrings"],           sets: 3, targetReps: 12, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
      { name: "Leg Extension",     muscleGroups: ["Quads"],                sets: 3, targetReps: 15, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
      { name: "Calf Raise",        muscleGroups: ["Calves"],               sets: 4, targetReps: 15, restSeconds: 60,  targetRepsMin: 12, targetRepsMax: 20 },
    ],
  },
  {
    id: "preset-fullbody",
    name: "Full Body",
    exercises: [
      { name: "Squat",             muscleGroups: ["Quads", "Glutes"],                 sets: 3, targetReps: 8,  restSeconds: 120, targetRepsMin: 3, targetRepsMax: 6  },
      { name: "Bench Press",       muscleGroups: ["Chest", "Triceps", "Front Delts"], sets: 3, targetReps: 8,  restSeconds: 120, targetRepsMin: 3, targetRepsMax: 6  },
      { name: "Barbell Row",       muscleGroups: ["Back", "Rear Delts", "Biceps"],    sets: 3, targetReps: 8,  restSeconds: 120, targetRepsMin: 6, targetRepsMax: 10 },
      { name: "Shoulder Press",    muscleGroups: ["Shoulders", "Triceps"],            sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 3, targetRepsMax: 6  },
      { name: "Romanian Deadlift", muscleGroups: ["Hamstrings", "Glutes"],            sets: 3, targetReps: 10, restSeconds: 90,  targetRepsMin: 3, targetRepsMax: 6  },
      { name: "Barbell Curl",      muscleGroups: ["Biceps"],                          sets: 3, targetReps: 10, restSeconds: 60,  targetRepsMin: 6, targetRepsMax: 10 },
    ],
  },
];
