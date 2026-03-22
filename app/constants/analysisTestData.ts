/**
 * Analysis engine test dataset.
 *
 * Each scenario uses a unique exercise name so all 10 show as separate
 * progression cards. Toggle via the "Test" button on the dashboard.
 *
 * History is newest-first, matching real app storage convention.
 * Goes through the exact same analysis pipeline as real data.
 */
import type { WorkoutSession, ExerciseSet } from "@/app/types";

let _n = 0;
const tid = () => `test_${++_n}`;

const D1 = new Date("2025-01-01T09:00:00Z").getTime(); // oldest
const D2 = new Date("2025-01-08T09:00:00Z").getTime();
const D3 = new Date("2025-01-15T09:00:00Z").getTime(); // newest

function mkSet(
  weight: string,
  reps: string,
  type: ExerciseSet["type"] = "Normal",
): ExerciseSet {
  return { id: tid(), weight, reps, type, restSeconds: 180, completed: true };
}

// ─── Session 1 (oldest) ──────────────────────────────────────────────────────
// First entry for every multi-session scenario.

const REST = { warmupRestSeconds: 45, workingRestSeconds: 90 };

const W1: WorkoutSession = {
  id: tid(),
  name: "Analysis Test — S1",
  status: "completed",
  startedAt: D1,
  exercises: [
    // Scenario 1: same weight, more reps
    { id: tid(), exerciseName: "S1: Same Wt More Reps",    muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
    // Scenario 2: same weight, fewer reps
    { id: tid(), exerciseName: "S2: Same Wt Fewer Reps",   muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
    // Scenario 3: more weight, same reps
    { id: tid(), exerciseName: "S3: More Wt Same Reps",    muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
    // Scenario 4: more weight, massive rep drop
    { id: tid(), exerciseName: "S4: Wt Up Reps Drop",      muscleGroups: ["Chest"], sets: [mkSet("100", "10")], ...REST },
    // Scenario 5: less weight, many more reps — e1RM should improve
    { id: tid(), exerciseName: "S5: Wt Down E1RM Up",      muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
    // Scenario 6: stagnation, session 1 of 3
    { id: tid(), exerciseName: "S6: Stagnation",           muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
  ],
};

// ─── Session 2 (middle) ──────────────────────────────────────────────────────
// Second entry for multi-session scenarios + S6 round 2.

const W2: WorkoutSession = {
  id: tid(),
  name: "Analysis Test — S2",
  status: "completed",
  startedAt: D2,
  exercises: [
    // Scenario 1: 100×6 — e1RM up → expected: progressing
    { id: tid(), exerciseName: "S1: Same Wt More Reps",    muscleGroups: ["Chest"], sets: [mkSet("100", "6")], ...REST },
    // Scenario 2: 100×3 — e1RM down, rDiff = -2 → expected: regressing
    { id: tid(), exerciseName: "S2: Same Wt Fewer Reps",   muscleGroups: ["Chest"], sets: [mkSet("100", "3")], ...REST },
    // Scenario 3: 102.5×5 — e1RM up → expected: progressing
    { id: tid(), exerciseName: "S3: More Wt Same Reps",    muscleGroups: ["Chest"], sets: [mkSet("102.5", "5")], ...REST },
    // Scenario 4: 102.5×1 — e1RM drops sharply (~24%) → expected: regressing
    { id: tid(), exerciseName: "S4: Wt Up Reps Drop",      muscleGroups: ["Chest"], sets: [mkSet("102.5", "1")], ...REST },
    // Scenario 5: 97.5×10 — e1RM ~124.5 vs ~116.7 (+6.6%) → expected: progressing, NOT regressing
    { id: tid(), exerciseName: "S5: Wt Down E1RM Up",      muscleGroups: ["Chest"], sets: [mkSet("97.5", "10")], ...REST },
    // Scenario 6: stagnation, session 2 of 3
    { id: tid(), exerciseName: "S6: Stagnation",           muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },
  ],
};

// ─── Session 3 (newest) ──────────────────────────────────────────────────────
// S6 round 3 + all single-session scenarios.

const W3: WorkoutSession = {
  id: tid(),
  name: "Analysis Test — S3",
  status: "completed",
  startedAt: D3,
  exercises: [
    // Scenario 6: stagnation, session 3 of 3 — expected: stagnating
    { id: tid(), exerciseName: "S6: Stagnation",           muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },

    // Scenario 7: back-off sets — top set MUST be 100×3, not phantom 100×10
    {
      id: tid(),
      exerciseName: "S7: Back-off Sets",
      muscleGroups: ["Chest"],
      sets: [
        mkSet("100", "3"),  // ← correct top set
        mkSet("80",  "10"), // ← back-off, must NOT override weight or reps
      ],
      ...REST,
    },

    // Scenario 8: pyramid sets — top set MUST be 100×1
    {
      id: tid(),
      exerciseName: "S8: Pyramid Sets",
      muscleGroups: ["Chest"],
      sets: [
        mkSet("80",  "5"),
        mkSet("90",  "3"),
        mkSet("100", "1"), // ← correct top set
      ],
      ...REST,
    },

    // Scenario 9: first session only — expected: low confidence, stagnating (no prev)
    { id: tid(), exerciseName: "S9: First Session",        muscleGroups: ["Chest"], sets: [mkSet("100", "5")], ...REST },

    // Scenario 10: warmup-only — expected: ignored entirely (no valid working sets)
    {
      id: tid(),
      exerciseName: "S10: Warmup Only",
      muscleGroups: ["Chest"],
      sets: [
        mkSet("20", "10", "Warm-up"),
        mkSet("40", "8",  "Warm-up"),
      ],
      ...REST,
    },
  ],
};

// Newest-first — matches real app history convention.
export const ANALYSIS_TEST_WORKOUTS: WorkoutSession[] = [W3, W2, W1];
