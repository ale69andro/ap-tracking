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
  remaining: number;
  total: number;
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
};

export type NextTarget = {
  weight: number;
  repsMin: number;
  repsMax: number;
  /** Short actionable note shown to the user. */
  note: string;
};

// ─── Backward-compat alias ────────────────────────────────────────────────────

export type Workout = WorkoutSession;
