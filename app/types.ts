export type SetType = "Normal" | "Warm-up" | "Drop Set";

// ─── Core Entities ────────────────────────────────────────────────────────────

export type ExerciseSet = {
  id: string;
  weight: string;
  reps: string;
  type: SetType;
  restSeconds: number;
  completed: boolean;
  completedAt?: number;
};

export type SessionExercise = {
  id: string;
  exerciseName: string;
  muscleGroups: string[];
  notes?: string;
  sets: ExerciseSet[];
  warmupRestSeconds: number;
  workingRestSeconds: number;
};

export type WorkoutSession = {
  id: string;
  templateId?: string;
  name: string;
  status: "active" | "completed";
  startedAt: number;       // Date.now() — 0 for migrated records without timestamp
  endedAt?: number;
  durationSeconds?: number;
  date?: string;           // legacy: pre-formatted display date for old records
  exercises: SessionExercise[];
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt?: number;
};

export type TemplateExercise = {
  name: string;
  muscleGroups: string[];
  /** Number of sets to pre-create (undefined on legacy templates → defaults to 1) */
  sets?: number;
  /** Target reps pre-filled in each set (undefined on legacy templates → empty) */
  targetReps?: number;
  /** Rest time pre-filled in each set (undefined on legacy templates → 60s) */
  restSeconds?: number;
  /**
   * Optional suggested starting weight (kg). Acts as a fallback when no
   * previous session data exists for this exercise. Never enforced — the user
   * can change it freely during the workout.
   */
  startWeight?: string;
  notes?: string;
};

export type WorkoutHighlight = {
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
};

// ─── Supporting Types ─────────────────────────────────────────────────────────

export type LibraryExercise = {
  name: string;
  muscleGroups: string[];
  /** Optional equipment tag — used for data completeness and future filtering. */
  equipment?: "Barbell" | "Dumbbell" | "Machine" | "Cable" | "Bodyweight";
};

export type ActiveTimer = {
  setId: string;
  /** Original duration in seconds — used for progress bar display only. */
  total: number;
  /** Timestamp (Date.now()) when the timer was started. */
  startedAt: number;
  /** Total duration in milliseconds. */
  durationMs: number;
};

export type ExerciseSession = {
  date: string;
  topWeight: number;
  topReps: number;
  totalVolume: number;
  score: number;
};

export type ExerciseProgression = {
  name: string;
  muscleGroups: string[];
  bestWeight: number;
  recentSessions: ExerciseSession[];
  trend: "up" | "flat" | "down" | "none";
  trendScore: number;
  lastSeen: string;
  analysis?: ExerciseAnalysisResult;
};

export type NextTarget = {
  weight: number;
  repsMin: number;
  repsMax: number;
  /** Short actionable note shown to the user. */
  note: string;
};

// ─── Progression Interpretation ───────────────────────────────────────────────

export type ProgressionStatus =
  | "progressing"
  | "improving_slightly"
  | "stable"
  | "stalling"
  | "fatigue_dip"
  | "regressing";

/**
 * High-level coaching interpretation of recent exercise performance.
 * Computed by interpretProgression() from an e1RM series.
 * Separates noise, fatigue dips, stalls, and real regressions.
 */
export type ProgressionInterpretation = {
  status: ProgressionStatus;
  /** 3-state UI signal derived from the 6-state internal status.
   *  progressing | improving_slightly → "progressing"
   *  stable | stalling | fatigue_dip  → "stagnating"
   *  regressing                       → "regressing"
   */
  mappedStatus: "progressing" | "stagnating" | "regressing";
  confidence: "low" | "medium" | "high";
  /** Short headline for the card — e.g. "Strength trending up" */
  title: string;
  /** One-line context — e.g. "Consistent gains over recent sessions" */
  subtitle: string;
  /** Actionable coaching note */
  recommendation: string;
};

export type ExerciseAnalysisResult = {
  exerciseName: string;
  trend: "progressing" | "stagnating" | "regressing";
  reason: string;
  currentE1RM: number | null;
  previousE1RM: number | null;
  /** Percentage change (e.g. 5 means +5%). Null when no previous session. */
  volumeDeltaPct: number | null;
  suggestedNextWeight: number | null;
  suggestedRepRange: string | null;
  confidence: "low" | "medium" | "high";
  bestWeight: number | null;
  lastTopSet: { weight: number; reps: number } | null;
  /** Smarter coaching interpretation — see ProgressionInterpretation */
  interpretation?: ProgressionInterpretation;
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export type UserProfile = {
  sex: "male" | "female";
  weight: number;
  height: number;
  experience: "beginner" | "intermediate" | "advanced";
  goal: "hypertrophy" | "strength" | "recomp";
  trainingDaysPerWeek: number;
  sleepQuality: "low" | "medium" | "high";
};

// ─── Backward-compat alias ────────────────────────────────────────────────────

export type Workout = WorkoutSession;
