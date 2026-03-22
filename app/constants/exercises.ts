import type {
  BuiltInExercise,
  CoachTag,
  Equipment,
  ExerciseCategory,
  LibraryExercise,
  MovementType,
} from "@/app/types";

// ─── Builder ──────────────────────────────────────────────────────────────────
//
// All built-in exercises are created through defineExercise().
// This ensures muscleGroups is always exactly primaryMuscleGroups + secondaryMuscleGroups
// — the two cannot silently drift apart.

type ExerciseDef = {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups?: string[];
  equipment: Equipment;
  movementType: MovementType;
  unilateral?: boolean;
  coachTags?: CoachTag[];
};

function defineExercise(def: ExerciseDef): BuiltInExercise {
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    primaryMuscleGroups: def.primaryMuscleGroups,
    secondaryMuscleGroups: def.secondaryMuscleGroups ?? [],
    equipment: def.equipment,
    movementType: def.movementType,
    unilateral: def.unilateral ?? false,
    coachTags: def.coachTags ?? [],
    // Derived — always in sync with primary + secondary:
    muscleGroups: [
      ...def.primaryMuscleGroups,
      ...(def.secondaryMuscleGroups ?? []),
    ],
  };
}

// ─── Exercise Library ─────────────────────────────────────────────────────────
//
// Organized by primary muscle group category.
// Naming convention: short, universal, no brand names.

export const LIBRARY: BuiltInExercise[] = [

  // ── Chest ────────────────────────────────────────────────────────────────────
  defineExercise({ id: "bench-press",            name: "Bench Press",            category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Barbell",    movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "incline-bench-press",    name: "Incline Bench Press",    category: "Chest",     primaryMuscleGroups: ["Upper Chest"],                 secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Barbell",    movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "decline-bench-press",    name: "Decline Bench Press",    category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: ["Triceps"],                 equipment: "Barbell",    movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "dumbbell-bench-press",   name: "Dumbbell Bench Press",   category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Dumbbell",   movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "Chest",     primaryMuscleGroups: ["Upper Chest"],                 secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Dumbbell",   movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "decline-dumbbell-press", name: "Decline Dumbbell Press", category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: ["Triceps"],                 equipment: "Dumbbell",   movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "smith-bench-press",         name: "Smith Machine Bench Press",        category: "Chest",     primaryMuscleGroups: ["Chest"],       secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Smith",   movementType: "Press", coachTags: ["compound", "beginner"]  }),
  defineExercise({ id: "smith-incline-press",       name: "Smith Machine Incline Press",      category: "Chest",     primaryMuscleGroups: ["Upper Chest"], secondaryMuscleGroups: ["Triceps", "Front Delts"],  equipment: "Smith",   movementType: "Press", coachTags: ["compound", "beginner"]  }),
  defineExercise({ id: "machine-chest-press",       name: "Machine Chest Press",              category: "Chest",     primaryMuscleGroups: ["Chest"],       secondaryMuscleGroups: ["Triceps"],                  equipment: "Machine", movementType: "Press", coachTags: ["compound", "beginner"]  }),
  defineExercise({ id: "chest-fly",              name: "Chest Fly",              category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: [],                          equipment: "Dumbbell",   movementType: "Fly",       coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-fly",              name: "Cable Fly",              category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Fly",       coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-crossover",        name: "Cable Crossover",        category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Fly",       coachTags: ["isolation"]                    }),
  defineExercise({ id: "pec-deck",               name: "Pec Deck",               category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: [],                          equipment: "Machine",    movementType: "Fly",       coachTags: ["isolation", "beginner"]        }),
  defineExercise({ id: "push-up",                name: "Push-Up",                category: "Chest",     primaryMuscleGroups: ["Chest"],                       secondaryMuscleGroups: ["Triceps"],                 equipment: "Bodyweight", movementType: "Press",     coachTags: ["compound", "beginner"]         }),

  // ── Back ─────────────────────────────────────────────────────────────────────
  defineExercise({ id: "deadlift",               name: "Deadlift",               category: "Back",      primaryMuscleGroups: ["Back", "Hamstrings"],          secondaryMuscleGroups: ["Glutes"],                  equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "rack-pull",              name: "Rack Pull",              category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Hamstrings", "Glutes"],    equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "barbell-row",            name: "Barbell Row",            category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Rear Delts", "Biceps"],    equipment: "Barbell",    movementType: "Row",       coachTags: ["compound"]                     }),
  defineExercise({ id: "pendlay-row",            name: "Pendlay Row",            category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Rear Delts", "Biceps"],    equipment: "Barbell",    movementType: "Row",       coachTags: ["compound"]                     }),
  defineExercise({ id: "t-bar-row",              name: "T-Bar Row",              category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Rear Delts", "Biceps"],    equipment: "Barbell",    movementType: "Row",       coachTags: ["compound"]                     }),
  defineExercise({ id: "single-arm-db-row",      name: "Single-Arm Dumbbell Row", category: "Back",    primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Biceps"],                  equipment: "Dumbbell",   movementType: "Row",       unilateral: true, coachTags: ["compound", "unilateral"] }),
  defineExercise({ id: "chest-supported-row",    name: "Chest-Supported Row",    category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Rear Delts", "Biceps"],    equipment: "Dumbbell",   movementType: "Row",       coachTags: ["compound"]                     }),
  defineExercise({ id: "seated-cable-row",       name: "Seated Cable Row",       category: "Back",      primaryMuscleGroups: ["Back"],                        secondaryMuscleGroups: ["Biceps"],                  equipment: "Cable",      movementType: "Row",       coachTags: ["compound"]                     }),
  defineExercise({ id: "lat-pulldown",           name: "Lat Pulldown",           category: "Back",      primaryMuscleGroups: ["Lats"],                        secondaryMuscleGroups: ["Biceps"],                  equipment: "Machine",    movementType: "Pull-down", coachTags: ["compound"]                     }),
  defineExercise({ id: "wide-grip-lat-pulldown", name: "Wide-Grip Lat Pulldown", category: "Back",      primaryMuscleGroups: ["Lats", "Upper Back"],          secondaryMuscleGroups: ["Biceps"],                  equipment: "Machine",    movementType: "Pull-down", coachTags: ["compound"]                     }),
  defineExercise({ id: "straight-arm-pulldown",  name: "Straight-Arm Pulldown",  category: "Back",      primaryMuscleGroups: ["Lats"],                        secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Pull-down", coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-pullover",         name: "Cable Pullover",         category: "Back",      primaryMuscleGroups: ["Lats"],                        secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Pull-down", coachTags: ["isolation"]                    }),
  defineExercise({ id: "pull-up",                name: "Pull Up",                category: "Back",      primaryMuscleGroups: ["Lats", "Upper Back"],          secondaryMuscleGroups: ["Biceps"],                  equipment: "Bodyweight", movementType: "Pull-up",   coachTags: ["compound"]                     }),
  defineExercise({ id: "chin-up",                name: "Chin Up",                category: "Back",      primaryMuscleGroups: ["Lats"],                        secondaryMuscleGroups: ["Biceps"],                  equipment: "Bodyweight", movementType: "Pull-up",   coachTags: ["compound"]                     }),
  defineExercise({ id: "face-pull",              name: "Face Pull",              category: "Back",      primaryMuscleGroups: ["Rear Delts", "Upper Back"],    secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Row",       coachTags: ["isolation"]                    }),

  // ── Shoulders ────────────────────────────────────────────────────────────────
  defineExercise({ id: "shoulder-press",          name: "Shoulder Press",          category: "Shoulders", primaryMuscleGroups: ["Shoulders"],                   secondaryMuscleGroups: ["Triceps"],                 equipment: "Barbell",    movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", category: "Shoulders", primaryMuscleGroups: ["Shoulders"],                   secondaryMuscleGroups: ["Triceps"],                 equipment: "Dumbbell",   movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "arnold-press",            name: "Arnold Press",            category: "Shoulders", primaryMuscleGroups: ["Shoulders"],                   secondaryMuscleGroups: ["Triceps"],                 equipment: "Dumbbell",   movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "machine-shoulder-press",   name: "Machine Shoulder Press",  category: "Shoulders", primaryMuscleGroups: ["Shoulders"],                   secondaryMuscleGroups: ["Triceps"],                 equipment: "Machine",    movementType: "Press",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "smith-shoulder-press",     name: "Smith Machine Shoulder Press", category: "Shoulders", primaryMuscleGroups: ["Shoulders"],              secondaryMuscleGroups: ["Triceps"],                 equipment: "Smith",      movementType: "Press",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "lateral-raise",           name: "Lateral Raise",           category: "Shoulders", primaryMuscleGroups: ["Side Delts"],                  secondaryMuscleGroups: [],                          equipment: "Dumbbell",   movementType: "Raise",     unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "cable-lateral-raise",     name: "Cable Lateral Raise",     category: "Shoulders", primaryMuscleGroups: ["Side Delts"],                  secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Raise",     unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "front-raise",             name: "Front Raise",             category: "Shoulders", primaryMuscleGroups: ["Front Delts"],                 secondaryMuscleGroups: ["Shoulders"],               equipment: "Dumbbell",   movementType: "Raise",     coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-front-raise",       name: "Cable Front Raise",       category: "Shoulders", primaryMuscleGroups: ["Front Delts"],                 secondaryMuscleGroups: [],                          equipment: "Cable",      movementType: "Raise",     coachTags: ["isolation"]                    }),
  defineExercise({ id: "reverse-fly",             name: "Reverse Fly",             category: "Shoulders", primaryMuscleGroups: ["Rear Delts"],                  secondaryMuscleGroups: [],                          equipment: "Dumbbell",   movementType: "Fly",       coachTags: ["isolation"]                    }),
  defineExercise({ id: "rear-delt-machine",       name: "Rear Delt Machine",       category: "Shoulders", primaryMuscleGroups: ["Rear Delts"],                  secondaryMuscleGroups: [],                          equipment: "Machine",    movementType: "Fly",       coachTags: ["isolation", "beginner"]        }),
  defineExercise({ id: "upright-row",             name: "Upright Row",             category: "Shoulders", primaryMuscleGroups: ["Shoulders", "Rear Delts"],     secondaryMuscleGroups: ["Biceps"],                  equipment: "Barbell",    movementType: "Row",       coachTags: ["compound"]                     }),

  // ── Biceps ───────────────────────────────────────────────────────────────────
  defineExercise({ id: "barbell-curl",       name: "Barbell Curl",        category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Barbell",    movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "ez-bar-curl",        name: "EZ Bar Curl",         category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "EZ Bar",     movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "dumbbell-curl",      name: "Dumbbell Curl",       category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Dumbbell",   movementType: "Curl",      unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "hammer-curl",        name: "Hammer Curl",         category: "Arms", primaryMuscleGroups: ["Biceps", "Forearms"],  secondaryMuscleGroups: [],              equipment: "Dumbbell",   movementType: "Curl",      unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "incline-db-curl",    name: "Incline Dumbbell Curl", category: "Arms", primaryMuscleGroups: ["Biceps"],            secondaryMuscleGroups: [],              equipment: "Dumbbell",   movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "preacher-curl",      name: "Preacher Curl",       category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Barbell",    movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "concentration-curl", name: "Concentration Curl",  category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Dumbbell",   movementType: "Curl",      unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "cable-curl",         name: "Cable Curl",          category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Cable",      movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-hammer-curl",  name: "Cable Hammer Curl",   category: "Arms", primaryMuscleGroups: ["Biceps", "Forearms"],  secondaryMuscleGroups: [],              equipment: "Cable",      movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "spider-curl",        name: "Spider Curl",         category: "Arms", primaryMuscleGroups: ["Biceps"],              secondaryMuscleGroups: [],              equipment: "Barbell",    movementType: "Curl",      coachTags: ["isolation"]                    }),

  // ── Triceps ──────────────────────────────────────────────────────────────────
  defineExercise({ id: "close-grip-bench",       name: "Close-Grip Bench Press",    category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: ["Chest"],   equipment: "Barbell",    movementType: "Press",     coachTags: ["compound"]                     }),
  defineExercise({ id: "skull-crusher",          name: "Skull Crusher",             category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: [],          equipment: "Barbell",    movementType: "Extension", coachTags: ["isolation"]                    }),
  defineExercise({ id: "tricep-pushdown",        name: "Tricep Pushdown",           category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: [],          equipment: "Cable",      movementType: "Extension", coachTags: ["isolation"]                    }),
  defineExercise({ id: "cable-overhead-ext",     name: "Cable Overhead Extension",  category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: [],          equipment: "Cable",      movementType: "Extension", coachTags: ["isolation"]                    }),
  defineExercise({ id: "overhead-tricep-ext",    name: "Overhead Tricep Extension", category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: [],          equipment: "Dumbbell",   movementType: "Extension", coachTags: ["isolation"]                    }),
  defineExercise({ id: "tricep-kickback",        name: "Tricep Kickback",           category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: [],          equipment: "Dumbbell",   movementType: "Extension", unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "tricep-dips",            name: "Tricep Dips",               category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: ["Chest"],   equipment: "Bodyweight", movementType: "Press",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "diamond-push-up",        name: "Diamond Push-Up",           category: "Arms", primaryMuscleGroups: ["Triceps"],  secondaryMuscleGroups: ["Chest"],   equipment: "Bodyweight", movementType: "Press",     coachTags: ["compound", "beginner"]         }),

  // ── Legs ─────────────────────────────────────────────────────────────────────
  defineExercise({ id: "squat",               name: "Squat",                  category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: ["Glutes"],              equipment: "Barbell",    movementType: "Squat",     coachTags: ["compound"]                     }),
  defineExercise({ id: "front-squat",         name: "Front Squat",            category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: ["Glutes"],              equipment: "Barbell",    movementType: "Squat",     coachTags: ["compound"]                     }),
  defineExercise({ id: "goblet-squat",        name: "Goblet Squat",           category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: ["Glutes"],              equipment: "Dumbbell",   movementType: "Squat",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "hack-squat",          name: "Hack Squat",             category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Squat",     coachTags: ["compound"]                     }),
  defineExercise({ id: "smith-squat",         name: "Smith Machine Squat",    category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: ["Glutes"],              equipment: "Smith",      movementType: "Squat",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "leg-press",           name: "Leg Press",              category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: ["Glutes"],              equipment: "Machine",    movementType: "Squat",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "Legs", primaryMuscleGroups: ["Quads", "Glutes"],  secondaryMuscleGroups: [],                      equipment: "Dumbbell",   movementType: "Lunge",     unilateral: true, coachTags: ["compound", "unilateral"] }),
  defineExercise({ id: "walking-lunge",       name: "Walking Lunge",          category: "Legs",   primaryMuscleGroups: ["Quads", "Glutes"],  secondaryMuscleGroups: [],                      equipment: "Dumbbell",   movementType: "Lunge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "leg-extension",       name: "Leg Extension",          category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Extension", coachTags: ["isolation"]                    }),
  defineExercise({ id: "sissy-squat",         name: "Sissy Squat",            category: "Legs",   primaryMuscleGroups: ["Quads"],            secondaryMuscleGroups: [],                      equipment: "Bodyweight", movementType: "Squat",     coachTags: ["isolation"]                    }),
  defineExercise({ id: "romanian-deadlift",   name: "Romanian Deadlift",      category: "Legs",   primaryMuscleGroups: ["Hamstrings"],       secondaryMuscleGroups: ["Glutes"],              equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "dumbbell-rdl",        name: "Dumbbell Romanian Deadlift", category: "Legs", primaryMuscleGroups: ["Hamstrings"],    secondaryMuscleGroups: ["Glutes"],              equipment: "Dumbbell",   movementType: "Hinge",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "sumo-deadlift",       name: "Sumo Deadlift",          category: "Legs",   primaryMuscleGroups: ["Hamstrings", "Glutes"], secondaryMuscleGroups: ["Back"],           equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "stiff-leg-deadlift",  name: "Stiff-Leg Deadlift",     category: "Legs",   primaryMuscleGroups: ["Hamstrings"],       secondaryMuscleGroups: ["Glutes", "Back"],      equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "leg-curl",            name: "Leg Curl",               category: "Legs",   primaryMuscleGroups: ["Hamstrings"],       secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "nordic-hamstring-curl", name: "Nordic Hamstring Curl", category: "Legs",  primaryMuscleGroups: ["Hamstrings"],       secondaryMuscleGroups: [],                      equipment: "Bodyweight", movementType: "Curl",      coachTags: ["isolation"]                    }),
  defineExercise({ id: "calf-raise",          name: "Calf Raise",             category: "Legs",   primaryMuscleGroups: ["Calves"],           secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Raise",     coachTags: ["isolation"]                    }),
  defineExercise({ id: "seated-calf-raise",   name: "Seated Calf Raise",      category: "Legs",   primaryMuscleGroups: ["Calves"],           secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Raise",     coachTags: ["isolation"]                    }),
  defineExercise({ id: "leg-press-calf-raise", name: "Leg Press Calf Raise",  category: "Legs",   primaryMuscleGroups: ["Calves"],           secondaryMuscleGroups: [],                      equipment: "Machine",    movementType: "Raise",     coachTags: ["isolation"]                    }),

  // ── Glutes ───────────────────────────────────────────────────────────────────
  defineExercise({ id: "hip-thrust",          name: "Hip Thrust",             category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: ["Hamstrings"],  equipment: "Barbell",    movementType: "Hinge",     coachTags: ["compound"]                     }),
  defineExercise({ id: "dumbbell-hip-thrust", name: "Dumbbell Hip Thrust",    category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: ["Hamstrings"],  equipment: "Dumbbell",   movementType: "Hinge",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "glute-bridge",        name: "Glute Bridge",           category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: ["Hamstrings"],  equipment: "Bodyweight", movementType: "Hinge",     coachTags: ["compound", "beginner"]         }),
  defineExercise({ id: "single-leg-hip-thrust", name: "Single-Leg Hip Thrust", category: "Glutes", primaryMuscleGroups: ["Glutes"], secondaryMuscleGroups: [],             equipment: "Bodyweight", movementType: "Hinge",     unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "cable-kickback",      name: "Cable Kickback",         category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: [],             equipment: "Cable",      movementType: "Extension", unilateral: true, coachTags: ["isolation", "unilateral"] }),
  defineExercise({ id: "abductor-machine",    name: "Abductor Machine",       category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: [],             equipment: "Machine",    movementType: "Raise",     coachTags: ["isolation", "beginner"]        }),
  defineExercise({ id: "step-up",             name: "Step-Up",                category: "Glutes", primaryMuscleGroups: ["Glutes"],  secondaryMuscleGroups: ["Quads"],       equipment: "Dumbbell",   movementType: "Lunge",     unilateral: true, coachTags: ["compound", "unilateral"] }),

  // ── Core ─────────────────────────────────────────────────────────────────────
  defineExercise({ id: "plank",              name: "Plank",              category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Hold",      coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "side-plank",         name: "Side Plank",         category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Hold",      unilateral: true, coachTags: ["isolation", "beginner", "unilateral"] }),
  defineExercise({ id: "dead-bug",           name: "Dead Bug",           category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Hold",      coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "pallof-press",       name: "Pallof Press",       category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Cable",      movementType: "Hold",      coachTags: ["isolation"]             }),
  defineExercise({ id: "crunch",             name: "Crunch",             category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Extension", coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "bicycle-crunch",     name: "Bicycle Crunch",     category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Rotation",  coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "cable-crunch",       name: "Cable Crunch",       category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Cable",      movementType: "Extension", coachTags: ["isolation"]             }),
  defineExercise({ id: "russian-twist",      name: "Russian Twist",      category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Rotation",  coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "hanging-leg-raise",  name: "Hanging Leg Raise",  category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Raise",     coachTags: ["isolation"]             }),
  defineExercise({ id: "leg-raise",          name: "Leg Raise",          category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Raise",     coachTags: ["isolation", "beginner"] }),
  defineExercise({ id: "ab-rollout",         name: "Ab Rollout",         category: "Core", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: [], equipment: "Bodyweight", movementType: "Extension", coachTags: ["isolation"]             }),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the built-in entry for a given exercise name (case-insensitive), or undefined. */
export function findBuiltIn(name: string): BuiltInExercise | undefined {
  const lower = name.toLowerCase();
  return LIBRARY.find((e) => e.name.toLowerCase() === lower);
}

/** Merges built-in and user exercises, with built-ins taking priority on name collision. */
export function mergeLibrary(userExercises: LibraryExercise[]): LibraryExercise[] {
  const builtInNames = new Set(LIBRARY.map((e) => e.name.toLowerCase()));
  const userOnly = userExercises.filter((e) => !builtInNames.has(e.name.toLowerCase()));
  return [...LIBRARY, ...userOnly];
}
