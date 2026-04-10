/**
 * Coach Testing Mode — synthetic scenarios for validating coaching behavior.
 *
 * Each scenario provides ExerciseProgression[] directly (bypassing useProgression)
 * plus an optional muscle-group load override for testing coach hints.
 *
 * DEV USE ONLY — not imported in production paths.
 */

import type { ExerciseProgression, ExerciseSession, UserProfile } from "@/app/types";
import { computeTrend } from "@/app/lib/progression";
import { analyzeExerciseHistory } from "@/lib/analysis/analyzeExerciseHistory";

// ─── State shape ─────────────────────────────────────────────────────────────

export type CoachTestState = {
  scenarioId: string | null;
  profileOverride: Partial<UserProfile> | null;
  /**
   * Reserved for future training-day overrides.
   * Keeping this in the state shape now avoids a refactor later.
   */
  trainingDayOverride?: {
    nextDayIndex?: number;
    lastCompletedDayIndex?: number;
  } | null;
  /** Active check-in demo preset id, or null for real mode. */
  checkInPresetId: string | null;
};

export const COACH_TEST_INITIAL: CoachTestState = {
  scenarioId: null,
  profileOverride: null,
  trainingDayOverride: null,
  checkInPresetId: null,
};

// ─── Scenario type ───────────────────────────────────────────────────────────

export type CoachScenario = {
  id: string;
  label: string;
  progressions: ExerciseProgression[];
  muscleLoadOverride?: Record<string, "low" | "medium" | "high">;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function e1rm(w: number, r: number): number {
  return w * (1 + r / 30);
}

function session(date: string, w: number, r: number): ExerciseSession {
  return { date, topWeight: w, topReps: r, totalVolume: w * r * 3, score: e1rm(w, r), setCount: 3 };
}

/**
 * Builds an ExerciseProgression from raw sessions (oldest → newest).
 * Runs through the real analysis pipeline so interpretation is authentic.
 */
function prog(
  name: string,
  muscleGroups: string[],
  sessions: ExerciseSession[],
  globalMax = 140,
): ExerciseProgression {
  const bestWeight     = Math.max(...sessions.map((s) => s.topWeight));
  const recentSessions = sessions.slice(-5);
  const lastSeen       = sessions[sessions.length - 1].date;
  const trendScores    = recentSessions.map((s) => s.score);
  const trend          = computeTrend(trendScores);
  const analysis       = analyzeExerciseHistory(recentSessions, name);
  return {
    name,
    muscleGroups,
    bestWeight,
    recentSessions,
    trend,
    trendScore: Math.round((bestWeight / globalMax) * 100),
    lastSeen,
    analysis,
  };
}

// Sessions are ordered oldest → newest to match ExerciseProgression convention.
const D = [
  "2026-02-08",
  "2026-02-15",
  "2026-02-22",
  "2026-03-01",
  "2026-03-08",
] as const;

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const COACH_TEST_SCENARIOS: CoachScenario[] = [

  // ── 1. Progressing — Push (Chest / Triceps / Shoulders, low load) ──────────
  // Expected: ProgressionCard shows "Progressing" · coach hint → "good time to push it"
  {
    id: "progressing_push",
    label: "Progressing (Push)",
    progressions: [
      prog("Bench Press", ["Chest", "Triceps"], [
        session(D[0], 77.5, 5),
        session(D[1], 80,   5),
        session(D[2], 82.5, 5),
        session(D[3], 85,   5),
        session(D[4], 87.5, 5),
      ]),
      prog("Overhead Press", ["Shoulders", "Triceps"], [
        session(D[1], 50,   5),
        session(D[2], 52.5, 5),
        session(D[3], 55,   5),
        session(D[4], 57.5, 5),
      ]),
    ],
    muscleLoadOverride: { chest: "low", triceps: "low", shoulders: "low" },
  },

  // ── 2. Stalling — Pull (Back / Biceps, low load) ──────────────────────────
  // Expected: "Stagnating" · coach hint → "good time to push it"
  {
    id: "stalling_back",
    label: "Stalling (Back)",
    progressions: [
      prog("Barbell Row", ["Back", "Biceps"], [
        session(D[0], 75, 5),
        session(D[1], 75, 5),
        session(D[2], 75, 5),
        session(D[3], 75, 5),
        session(D[4], 75, 5),
      ]),
      prog("Lat Pulldown", ["Back", "Biceps"], [
        session(D[1], 62.5, 8),
        session(D[2], 62.5, 8),
        session(D[3], 62.5, 7),
        session(D[4], 62.5, 7),
      ]),
    ],
    muscleLoadOverride: { back: "low", biceps: "low" },
  },

  // ── 3. Fatigue dip — Legs (Quads / Hamstrings / Glutes, high load) ────────
  // Expected: "Stagnating / fatigue_dip" · coach hint → "keep intensity controlled"
  {
    id: "fatigue_dip_legs",
    label: "Fatigue dip (Legs)",
    progressions: [
      prog("Squat", ["Quads", "Glutes", "Hamstrings"], [
        session(D[0], 95,    5),
        session(D[1], 100,   5),
        session(D[2], 105,   5),
        session(D[3], 107.5, 5),
        session(D[4], 105,   5), // single dip after sustained up → fatigue_dip
      ], 140),
      prog("Leg Press", ["Quads", "Glutes"], [
        session(D[1], 150, 10),
        session(D[2], 160, 10),
        session(D[3], 165, 8),
        session(D[4], 158, 8), // dip
      ], 165),
    ],
    muscleLoadOverride: { quads: "high", glutes: "high", hamstrings: "high" },
  },

  // ── 4. Regressing — Full body (high load across groups) ───────────────────
  // Expected: "Regressing" across exercises · coach hint → "keep intensity controlled"
  {
    id: "regressing_full",
    label: "Regressing",
    progressions: [
      prog("Deadlift", ["Back", "Hamstrings", "Glutes"], [
        session(D[0], 140, 5),
        session(D[1], 135, 5),
        session(D[2], 130, 5),
        session(D[3], 125, 5),
        session(D[4], 120, 5),
      ], 140),
      prog("Squat", ["Quads", "Glutes", "Hamstrings"], [
        session(D[0], 110, 5),
        session(D[1], 105, 5),
        session(D[2], 100, 5),
        session(D[3], 95,  5),
        session(D[4], 90,  5),
      ], 140),
    ],
    muscleLoadOverride: { back: "high", quads: "high", hamstrings: "high", glutes: "high" },
  },

  // ── 5. Mixed / noisy — unclear signal ─────────────────────────────────────
  // Expected: mixed load map → coach hint falls back to "dial in based on how you feel"
  {
    id: "mixed_noisy",
    label: "Mixed / noisy",
    progressions: [
      prog("Bench Press", ["Chest", "Triceps"], [
        session(D[2], 80,   5),
        session(D[3], 82.5, 5),
        session(D[4], 85,   5),
      ]),
      prog("Barbell Row", ["Back", "Biceps"], [
        session(D[2], 70, 5),
        session(D[3], 70, 5),
        session(D[4], 70, 5),
      ]),
      prog("Squat", ["Quads", "Glutes", "Hamstrings"], [
        session(D[1], 100, 5),
        session(D[2], 95,  5),
        session(D[3], 105, 5),
        session(D[4], 98,  5), // noisy
      ], 140),
    ],
    muscleLoadOverride: { chest: "medium", back: "low", quads: "high" },
  },
];
