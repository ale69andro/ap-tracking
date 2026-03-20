import type { WorkoutSession, ExerciseSet } from "@/app/types";

// 12 sessions, newest-first (matching real history convention)
const DATES = [
  "2026-03-15", "2026-03-08", "2026-03-01", "2026-02-22",
  "2026-02-15", "2026-02-08", "2026-02-01", "2026-01-25",
  "2026-01-18", "2026-01-11", "2026-01-04", "2025-12-28",
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

type SessionData = [number[], number]; // [weights[], reps]

const EXERCISES: {
  exerciseName: string;
  muscleGroups: string[];
  /** Index 0 = newest (aligns with DATES[0]). null = not in that session. */
  sessions: (SessionData | null)[];
}[] = [
  // ── 1. Bench Press — steady linear progression (all 12 sessions) ──────────
  // Top weights chronological (oldest→newest): 62.5 → 65 → … → 90 kg × 5
  // E1RM: ~73 → ~105 — clear upward chart + "Progressing" badge
  {
    exerciseName: "Bench Press",
    muscleGroups: ["Chest", "Triceps"],
    sessions: [
      [[90, 87.5, 85], 5],   [[87.5, 85, 82.5], 5], [[85, 82.5, 80], 5],  [[82.5, 80, 77.5], 5],
      [[80, 77.5, 75], 5],   [[77.5, 75, 72.5], 5], [[75, 72.5, 70], 5],  [[72.5, 70, 67.5], 5],
      [[70, 67.5, 65], 5],   [[67.5, 65, 62.5], 5], [[65, 62.5, 60], 5],  [[62.5, 60, 57.5], 5],
    ],
  },

  // ── 2. Squat — peaked then regression (all 12 sessions) ──────────────────
  // Peak at 125 kg (session 6), declining since → current 95 × 5
  // slice(-5) E1RM trend: 137 → 130 → 122 → 117 → 111 → "Declining"
  {
    exerciseName: "Squat",
    muscleGroups: ["Quads", "Glutes", "Hamstrings"],
    sessions: [
      [[95, 92.5], 5],       [[100, 97.5], 5],       [[105, 102.5], 5],    [[112.5, 110], 5],
      [[117.5, 115], 5],     [[122.5, 120], 5],       [[125, 122.5], 5],    [[122.5, 120], 5],
      [[120, 117.5], 5],     [[117.5, 115], 5],       [[115, 112.5], 5],    [[112.5, 110], 5],
    ],
  },

  // ── 3. Deadlift — stagnation (all 12 sessions) ───────────────────────────
  // Stuck at 140 × 3 with occasional 137.5 — last 5 sessions identical
  // High confidence stagnation: badge "Plateau", chart flat
  {
    exerciseName: "Deadlift",
    muscleGroups: ["Back", "Hamstrings", "Glutes"],
    sessions: [
      [[140, 130], 3],       [[140, 130], 3],         [[140, 130], 3],      [[140, 130], 3],
      [[140, 130], 3],       [[137.5, 127.5], 3],     [[140, 130], 3],      [[140, 130], 3],
      [[137.5, 127.5], 3],   [[140, 130], 3],         [[137.5, 127.5], 3],  [[135, 125], 3],
    ],
  },

  // ── 4. Overhead Press — volatile E1RM, ends stagnating (10 sessions) ─────
  // Alternating between 45–55 kg with varying reps → bouncing E1RM
  // Last 2 sessions identical (50×7) → "Plateau" with volatile history chart
  {
    exerciseName: "Overhead Press",
    muscleGroups: ["Shoulders", "Triceps"],
    sessions: [
      [[50, 47.5], 7],       [[50, 47.5], 7],         [[52.5, 50], 6],      [[45, 42.5], 9],
      [[55, 52.5], 5],       [[47.5, 45], 8],         [[52.5, 50], 6],      [[50, 47.5], 7],
      [[47.5, 45], 8],       [[45, 42.5], 8],         null,                 null,
    ],
  },

  // ── 5. Romanian Deadlift — steady progression, higher reps (8 sessions) ──
  // 70→87.5 kg × 10 reps: weight +2.5 kg each session
  // E1RM with 10 reps = weight × 1.33 — clearly progressive
  {
    exerciseName: "Romanian Deadlift",
    muscleGroups: ["Hamstrings", "Glutes"],
    sessions: [
      [[87.5, 80], 10],      [[85, 77.5], 10],        [[82.5, 75], 10],     [[80, 72.5], 10],
      [[77.5, 70], 10],      [[75, 67.5], 10],        [[72.5, 65], 10],     [[70, 62.5], 10],
      null,                  null,                    null,                 null,
    ],
  },

  // ── 6. Lat Pulldown — lower weight, higher reps → E1RM trending up (8 sessions)
  // Top weight drops (65→60 kg) but reps rise (10→15) — E1RM: 86.7→90
  // Demonstrates: badge "Progressing", insight "More reps with less weight"
  {
    exerciseName: "Lat Pulldown",
    muscleGroups: ["Back", "Biceps"],
    sessions: [
      [[60], 15],            [[62.5], 12],             [[65], 10],           [[67.5], 8],
      [[65], 10],            [[62.5], 12],             [[60], 15],           [[65], 10],
      null,                  null,                    null,                 null,
    ],
  },

  // ── 7. Barbell Row — peaked then declining regression (all 12 sessions) ──
  // Rose to 90 kg (session 5), now back at 72.5 — clear decline over last 6 sessions
  {
    exerciseName: "Barbell Row",
    muscleGroups: ["Back", "Biceps"],
    sessions: [
      [[72.5, 70, 67.5], 8], [[75, 72.5, 70], 8],    [[80, 77.5, 75], 8],  [[82.5, 80, 77.5], 8],
      [[85, 82.5, 80], 8],   [[90, 87.5, 85], 8],    [[87.5, 85, 82.5], 8],[[85, 82.5, 80], 8],
      [[82.5, 80, 77.5], 8], [[80, 77.5, 75], 8],    [[77.5, 75, 72.5], 8],[[75, 72.5, 70], 8],
    ],
  },

  // ── 8. Cable Curl — early data state (3 sessions) ────────────────────────
  // Tests the "Early trend — 1 more session improves accuracy" note
  {
    exerciseName: "Cable Curl",
    muscleGroups: ["Biceps"],
    sessions: [
      [[32.5], 12],          [[30], 12],              [[27.5], 12],         null,
      null,                  null,                    null,                 null,
      null,                  null,                    null,                 null,
    ],
  },

  // ── 9. Tricep Pushdown — very early data (2 sessions) ────────────────────
  // Tests minimal sparkline and maximum early-data UI state
  {
    exerciseName: "Tricep Pushdown",
    muscleGroups: ["Triceps"],
    sessions: [
      [[35], 15],            [[32.5], 15],            null,                 null,
      null,                  null,                    null,                 null,
      null,                  null,                    null,                 null,
    ],
  },
];

export const DEMO_WORKOUTS: WorkoutSession[] = DATES.map((dateStr, i) => {
  const startedAt = new Date(dateStr + "T10:00:00").getTime();
  const exercises = EXERCISES
    .filter((ex) => ex.sessions[i] !== null)
    .map((ex) => ({
      id:           uid(),
      exerciseName: ex.exerciseName,
      muscleGroups: ex.muscleGroups,
      sets:         mkSets(ex.sessions[i]![0], ex.sessions[i]![1]),
    }));
  return {
    id:              uid(),
    name:            "Demo Workout",
    startedAt,
    status:          "completed" as const,
    durationSeconds: 3600,
    exercises,
  };
});
