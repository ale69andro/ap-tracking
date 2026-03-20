import type { WorkoutTemplate } from "@/app/types";

// ─── Built-in Preset Templates ────────────────────────────────────────────────
//
// These are protected defaults. They are never stored in localStorage.
// Users can start a workout directly from a preset, or "customize" it to
// create their own editable copy saved under My Templates.
//
// IDs use the "preset-" prefix to make origin clear during debugging.
// sets/targetReps/restSeconds are pre-configured with sensible gym defaults.

export const PRESET_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "preset-push",
    name: "Push",
    exercises: [
      { name: "Bench Press",            muscleGroups: ["Chest", "Triceps", "Front Delts"],       sets: 4, targetReps: 8,  restSeconds: 120 },
      { name: "Incline Dumbbell Press", muscleGroups: ["Upper Chest", "Triceps", "Front Delts"], sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Dumbbell Shoulder Press",muscleGroups: ["Shoulders", "Triceps"],                  sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Lateral Raise",          muscleGroups: ["Side Delts"],                            sets: 3, targetReps: 15, restSeconds: 60  },
      { name: "Tricep Pushdown",        muscleGroups: ["Triceps"],                               sets: 3, targetReps: 12, restSeconds: 60  },
      { name: "Overhead Tricep Extension", muscleGroups: ["Triceps"],                            sets: 3, targetReps: 12, restSeconds: 60  },
    ],
  },
  {
    id: "preset-pull",
    name: "Pull",
    exercises: [
      { name: "Barbell Row",      muscleGroups: ["Back", "Rear Delts", "Biceps"],  sets: 4, targetReps: 8,  restSeconds: 120 },
      { name: "Lat Pulldown",     muscleGroups: ["Lats", "Biceps"],                sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Seated Cable Row", muscleGroups: ["Back", "Biceps"],                sets: 3, targetReps: 12, restSeconds: 90  },
      { name: "Face Pull",        muscleGroups: ["Rear Delts", "Upper Back"],      sets: 3, targetReps: 15, restSeconds: 60  },
      { name: "Barbell Curl",     muscleGroups: ["Biceps"],                        sets: 3, targetReps: 10, restSeconds: 60  },
      { name: "Hammer Curl",      muscleGroups: ["Biceps", "Forearms"],            sets: 3, targetReps: 12, restSeconds: 60  },
    ],
  },
  {
    id: "preset-legs",
    name: "Legs",
    exercises: [
      { name: "Squat",              muscleGroups: ["Quads", "Glutes"],     sets: 4, targetReps: 8,  restSeconds: 180 },
      { name: "Leg Press",          muscleGroups: ["Quads", "Glutes"],     sets: 3, targetReps: 10, restSeconds: 120 },
      { name: "Romanian Deadlift",  muscleGroups: ["Hamstrings", "Glutes"],sets: 3, targetReps: 10, restSeconds: 120 },
      { name: "Leg Curl",           muscleGroups: ["Hamstrings"],           sets: 3, targetReps: 12, restSeconds: 60  },
      { name: "Leg Extension",      muscleGroups: ["Quads"],               sets: 3, targetReps: 15, restSeconds: 60  },
      { name: "Calf Raise",         muscleGroups: ["Calves"],              sets: 4, targetReps: 15, restSeconds: 60  },
    ],
  },
  {
    id: "preset-upper",
    name: "Upper Body",
    exercises: [
      { name: "Bench Press",      muscleGroups: ["Chest", "Triceps", "Front Delts"], sets: 4, targetReps: 8,  restSeconds: 120 },
      { name: "Barbell Row",      muscleGroups: ["Back", "Rear Delts", "Biceps"],    sets: 4, targetReps: 8,  restSeconds: 120 },
      { name: "Shoulder Press",   muscleGroups: ["Shoulders", "Triceps"],            sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Lat Pulldown",     muscleGroups: ["Lats", "Biceps"],                  sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Lateral Raise",    muscleGroups: ["Side Delts"],                      sets: 3, targetReps: 15, restSeconds: 60  },
      { name: "Barbell Curl",     muscleGroups: ["Biceps"],                          sets: 3, targetReps: 12, restSeconds: 60  },
      { name: "Tricep Pushdown",  muscleGroups: ["Triceps"],                         sets: 3, targetReps: 12, restSeconds: 60  },
    ],
  },
  {
    id: "preset-lower",
    name: "Lower Body",
    exercises: [
      { name: "Squat",             muscleGroups: ["Quads", "Glutes"],      sets: 4, targetReps: 8,  restSeconds: 180 },
      { name: "Romanian Deadlift", muscleGroups: ["Hamstrings", "Glutes"], sets: 3, targetReps: 10, restSeconds: 120 },
      { name: "Hip Thrust",        muscleGroups: ["Glutes"],               sets: 3, targetReps: 12, restSeconds: 90  },
      { name: "Leg Curl",          muscleGroups: ["Hamstrings"],            sets: 3, targetReps: 12, restSeconds: 60  },
      { name: "Leg Extension",     muscleGroups: ["Quads"],                sets: 3, targetReps: 15, restSeconds: 60  },
      { name: "Calf Raise",        muscleGroups: ["Calves"],               sets: 4, targetReps: 15, restSeconds: 60  },
    ],
  },
  {
    id: "preset-fullbody",
    name: "Full Body",
    exercises: [
      { name: "Squat",            muscleGroups: ["Quads", "Glutes"],                        sets: 3, targetReps: 8,  restSeconds: 120 },
      { name: "Bench Press",      muscleGroups: ["Chest", "Triceps", "Front Delts"],        sets: 3, targetReps: 8,  restSeconds: 120 },
      { name: "Barbell Row",      muscleGroups: ["Back", "Rear Delts", "Biceps"],           sets: 3, targetReps: 8,  restSeconds: 120 },
      { name: "Shoulder Press",   muscleGroups: ["Shoulders", "Triceps"],                  sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Romanian Deadlift",muscleGroups: ["Hamstrings", "Glutes"],                  sets: 3, targetReps: 10, restSeconds: 90  },
      { name: "Barbell Curl",     muscleGroups: ["Biceps"],                                sets: 3, targetReps: 10, restSeconds: 60  },
    ],
  },
];
