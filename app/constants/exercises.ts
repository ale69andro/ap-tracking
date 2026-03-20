import type { LibraryExercise } from "@/app/types";

// ─── Exercise Library ─────────────────────────────────────────────────────────
//
// Organized by primary muscle group. Each entry has:
//   name         – display name (also used as the unique key in templates/sessions)
//   muscleGroups – fine-grained target muscles (drives category filtering)
//   equipment    – optional tag for future equipment-based filtering
//
// Naming convention: keep names short and universal.

export const LIBRARY: LibraryExercise[] = [

  // ── Chest ──────────────────────────────────────────────────────────────────
  { name: "Bench Press",           muscleGroups: ["Chest", "Triceps", "Front Delts"],        equipment: "Barbell"    },
  { name: "Incline Bench Press",   muscleGroups: ["Upper Chest", "Triceps", "Front Delts"],  equipment: "Barbell"    },
  { name: "Decline Bench Press",   muscleGroups: ["Chest", "Triceps"],                       equipment: "Barbell"    },
  { name: "Dumbbell Bench Press",  muscleGroups: ["Chest", "Triceps", "Front Delts"],        equipment: "Dumbbell"   },
  { name: "Incline Dumbbell Press",muscleGroups: ["Upper Chest", "Triceps", "Front Delts"],  equipment: "Dumbbell"   },
  { name: "Chest Fly",             muscleGroups: ["Chest"],                                  equipment: "Dumbbell"   },
  { name: "Cable Fly",             muscleGroups: ["Chest"],                                  equipment: "Cable"      },
  { name: "Push-Up",               muscleGroups: ["Chest", "Triceps"],                       equipment: "Bodyweight" },

  // ── Back ───────────────────────────────────────────────────────────────────
  { name: "Deadlift",              muscleGroups: ["Back", "Hamstrings", "Glutes"],            equipment: "Barbell"    },
  { name: "Barbell Row",           muscleGroups: ["Back", "Rear Delts", "Biceps"],            equipment: "Barbell"    },
  { name: "T-Bar Row",             muscleGroups: ["Back", "Rear Delts", "Biceps"],            equipment: "Barbell"    },
  { name: "Single-Arm Dumbbell Row",muscleGroups: ["Back", "Biceps"],                        equipment: "Dumbbell"   },
  { name: "Lat Pulldown",          muscleGroups: ["Lats", "Biceps"],                          equipment: "Machine"    },
  { name: "Pull Up",               muscleGroups: ["Lats", "Upper Back", "Biceps"],            equipment: "Bodyweight" },
  { name: "Chin Up",               muscleGroups: ["Lats", "Biceps"],                          equipment: "Bodyweight" },
  { name: "Seated Cable Row",      muscleGroups: ["Back", "Biceps"],                          equipment: "Cable"      },
  { name: "Face Pull",             muscleGroups: ["Rear Delts", "Upper Back"],                equipment: "Cable"      },
  { name: "Straight-Arm Pulldown", muscleGroups: ["Lats"],                                   equipment: "Cable"      },

  // ── Shoulders ──────────────────────────────────────────────────────────────
  { name: "Shoulder Press",        muscleGroups: ["Shoulders", "Triceps"],                   equipment: "Barbell"    },
  { name: "Dumbbell Shoulder Press",muscleGroups: ["Shoulders", "Triceps"],                  equipment: "Dumbbell"   },
  { name: "Arnold Press",          muscleGroups: ["Shoulders", "Triceps"],                   equipment: "Dumbbell"   },
  { name: "Lateral Raise",         muscleGroups: ["Side Delts"],                             equipment: "Dumbbell"   },
  { name: "Cable Lateral Raise",   muscleGroups: ["Side Delts"],                             equipment: "Cable"      },
  { name: "Front Raise",           muscleGroups: ["Front Delts", "Shoulders"],               equipment: "Dumbbell"   },
  { name: "Reverse Fly",           muscleGroups: ["Rear Delts"],                             equipment: "Dumbbell"   },
  { name: "Upright Row",           muscleGroups: ["Shoulders", "Rear Delts", "Biceps"],      equipment: "Barbell"    },

  // ── Biceps ─────────────────────────────────────────────────────────────────
  { name: "Barbell Curl",          muscleGroups: ["Biceps"],                                 equipment: "Barbell"    },
  { name: "Dumbbell Curl",         muscleGroups: ["Biceps"],                                 equipment: "Dumbbell"   },
  { name: "Hammer Curl",           muscleGroups: ["Biceps", "Forearms"],                     equipment: "Dumbbell"   },
  { name: "Incline Dumbbell Curl", muscleGroups: ["Biceps"],                                 equipment: "Dumbbell"   },
  { name: "Cable Curl",            muscleGroups: ["Biceps"],                                 equipment: "Cable"      },
  { name: "Preacher Curl",         muscleGroups: ["Biceps"],                                 equipment: "Barbell"    },

  // ── Triceps ────────────────────────────────────────────────────────────────
  { name: "Close-Grip Bench Press",muscleGroups: ["Triceps", "Chest"],                       equipment: "Barbell"    },
  { name: "Skull Crusher",         muscleGroups: ["Triceps"],                                equipment: "Barbell"    },
  { name: "Tricep Pushdown",       muscleGroups: ["Triceps"],                                equipment: "Cable"      },
  { name: "Cable Overhead Extension",muscleGroups: ["Triceps"],                              equipment: "Cable"      },
  { name: "Overhead Tricep Extension",muscleGroups: ["Triceps"],                             equipment: "Dumbbell"   },
  { name: "Tricep Dips",           muscleGroups: ["Triceps", "Chest"],                       equipment: "Bodyweight" },

  // ── Legs ───────────────────────────────────────────────────────────────────
  { name: "Squat",                 muscleGroups: ["Quads", "Glutes"],                        equipment: "Barbell"    },
  { name: "Front Squat",           muscleGroups: ["Quads", "Glutes"],                        equipment: "Barbell"    },
  { name: "Goblet Squat",          muscleGroups: ["Quads", "Glutes"],                        equipment: "Dumbbell"   },
  { name: "Hack Squat",            muscleGroups: ["Quads"],                                  equipment: "Machine"    },
  { name: "Bulgarian Split Squat", muscleGroups: ["Quads", "Glutes"],                        equipment: "Dumbbell"   },
  { name: "Leg Press",             muscleGroups: ["Quads", "Glutes"],                        equipment: "Machine"    },
  { name: "Leg Extension",         muscleGroups: ["Quads"],                                  equipment: "Machine"    },
  { name: "Leg Curl",              muscleGroups: ["Hamstrings"],                             equipment: "Machine"    },
  { name: "Romanian Deadlift",     muscleGroups: ["Hamstrings", "Glutes"],                   equipment: "Barbell"    },
  { name: "Sumo Deadlift",         muscleGroups: ["Hamstrings", "Glutes", "Back"],           equipment: "Barbell"    },
  { name: "Nordic Hamstring Curl", muscleGroups: ["Hamstrings"],                             equipment: "Bodyweight" },
  { name: "Calf Raise",            muscleGroups: ["Calves"],                                 equipment: "Machine"    },
  { name: "Seated Calf Raise",     muscleGroups: ["Calves"],                                 equipment: "Machine"    },

  // ── Glutes ─────────────────────────────────────────────────────────────────
  { name: "Hip Thrust",            muscleGroups: ["Glutes"],                                 equipment: "Barbell"    },
  { name: "Glute Bridge",          muscleGroups: ["Glutes", "Hamstrings"],                   equipment: "Bodyweight" },
  { name: "Cable Kickback",        muscleGroups: ["Glutes"],                                 equipment: "Cable"      },
  { name: "Step-Up",               muscleGroups: ["Glutes", "Quads"],                        equipment: "Dumbbell"   },

  // ── Core ───────────────────────────────────────────────────────────────────
  { name: "Plank",                 muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
  { name: "Side Plank",            muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
  { name: "Crunch",                muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
  { name: "Cable Crunch",          muscleGroups: ["Core"],                                   equipment: "Cable"      },
  { name: "Hanging Leg Raise",     muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
  { name: "Ab Rollout",            muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
  { name: "Russian Twist",         muscleGroups: ["Core"],                                   equipment: "Bodyweight" },
];

// ─── Muscle Group Categories ──────────────────────────────────────────────────
//
// Maps display labels (shown as filter pills) to the fine-grained muscle group
// strings used in LIBRARY entries. An exercise appears under a category if any
// of its muscleGroups intersects the category's muscles array.

export const MUSCLE_GROUP_CATEGORIES = [
  { label: "Chest",     muscles: ["Chest", "Upper Chest"] },
  { label: "Back",      muscles: ["Back", "Upper Back", "Lats"] },
  { label: "Shoulders", muscles: ["Shoulders", "Front Delts", "Side Delts", "Rear Delts"] },
  { label: "Arms",      muscles: ["Biceps", "Triceps", "Forearms"] },
  { label: "Legs",      muscles: ["Quads", "Hamstrings", "Calves"] },
  { label: "Glutes",    muscles: ["Glutes"] },
  { label: "Core",      muscles: ["Core"] },
];
