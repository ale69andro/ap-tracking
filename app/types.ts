export type SetType = "Normal" | "Warm-up" | "Drop Set";

/** Shared trend classification used across all analysis, UI, and recommendation layers. */
export type ExerciseTrend = "up" | "flat" | "down" | "none" | "mixed";

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
  trainingDayIndex?: number; // 0-based index into TrainingPlan.days[] when started from a plan
  name: string;
  status: "active" | "completed";
  startedAt: number;       // Date.now() — 0 for migrated records without timestamp
  endedAt?: number;
  durationSeconds?: number;
  date?: string;           // legacy: pre-formatted display date for old records
  exercises: SessionExercise[];
  /** Snapshot of the template's exercise list at session start — used for structureChanged detection. Only set when started from a template. */
  originalTemplateExercises?: TemplateExercise[];
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
  /** Double progression: lower bound of the rep range (e.g. 5 in "5–8") */
  targetRepsMin?: number;
  /** Double progression: upper bound of the rep range (e.g. 8 in "5–8") */
  targetRepsMax?: number;
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

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Kettlebell"
  | "EZ Bar"
  | "Machine"
  | "Cable"
  | "Smith"
  | "Bodyweight";

export type ExerciseCategory =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Legs"
  | "Glutes"
  | "Core";

export type MovementType =
  | "Press"
  | "Row"
  | "Pull-down"
  | "Pull-up"
  | "Hinge"
  | "Squat"
  | "Lunge"
  | "Curl"
  | "Extension"
  | "Fly"
  | "Raise"
  | "Carry"
  | "Hold"
  | "Rotation";

/** High-signal tags used by the coach for exercise selection and suggestions. */
export type CoachTag = "compound" | "isolation" | "beginner" | "unilateral";

export type LibraryExercise = {
  name: string;
  muscleGroups: string[];
  /** Optional equipment tag — present on all built-in exercises. */
  equipment?: Equipment;
};

/**
 * A richer built-in exercise entry. Extends LibraryExercise so all existing
 * consumers continue to work unchanged.
 *
 * muscleGroups is always derived from primaryMuscleGroups + secondaryMuscleGroups
 * via defineExercise() — the two cannot drift apart.
 */
export type BuiltInExercise = LibraryExercise & {
  id: string;
  category: ExerciseCategory;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
  equipment: Equipment;
  movementType: MovementType;
  unilateral: boolean;
  coachTags: CoachTag[];
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
  /** Number of completed working sets in this session. */
  setCount: number;
};

export type ExerciseProgression = {
  name: string;
  muscleGroups: string[];
  bestWeight: number;
  recentSessions: ExerciseSession[];
  trend: ExerciseTrend;
  trendScore: number;
  lastSeen: string;
  analysis?: ExerciseAnalysisResult;
  /** Structured rep range from the template — enables double-progression ceiling logic. */
  repRange?: { min: number; max: number };
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
  trend: "progressing" | "mixed" | "stagnating" | "regressing";
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

// ─── Training Profile Input Types ─────────────────────────────────────────────

export type StressLevel = "low" | "moderate" | "high";
export type IntensityStyle = "heavy_low_rep" | "moderate" | "mixed" | "auto";
export type ProximityToFailure = "technical_failure" | "one_to_two_rir" | "three_to_four_rir" | "very_conservative";
export type EquipmentAccess = "full_gym" | "dumbbells_only" | "barbell_only" | "home_gym" | "bodyweight_only";
export type LoadProgressionStyle = "linear" | "double_progression" | "wave_loading";

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Core";

// ─── Training Profile (derived/computed — never stored in DB) ─────────────────

export type TrainingProfile = {
  /** 0–100 recovery capacity score derived from sleep, stress, frequency, and sleep quality. */
  recoveryScore: number;
  loadProgressionStyle: LoadProgressionStyle;
  priorityMuscleGroups: MuscleGroup[];
  intensityStyle: IntensityStyle;
  proximityToFailure: ProximityToFailure;
  equipmentAccess: EquipmentAccess;
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
  keepScreenOn?:    boolean;
  restTimerSound?:  boolean;
  stressLevel?: StressLevel;
  intensityStyle?: IntensityStyle;
  proximityToFailure?: ProximityToFailure;
  equipmentAccess?: EquipmentAccess;
  priorityMuscleGroups?: MuscleGroup[];
};

// ─── Training Plan ────────────────────────────────────────────────────────────

export type TrainingDay = {
  id: string;
  dayNumber: number;   // 1, 2, 3...
  label?: string;      // "Push", "Pull", "Legs" — shown next to day number
  templateId?: string; // optional link to a WorkoutTemplate
};

/** Ordered sequence of training days. Structure only — no progress state. */
export type TrainingPlan = {
  id: string;
  name: string;
  days: TrainingDay[];
};

/** Mutable progress through a TrainingPlan. Stored separately from the plan. */
export type TrainingProgress = {
  planId: string;
  lastCompletedDayIndex: number | null; // 0-based index into TrainingPlan.days[]
  lastCompletedAt: number | null;       // timestamp of last completion
};

// ─── Coaching Suggestions ─────────────────────────────────────────────────────

export type WorkoutSuggestion = {
  type: 'next_set';
  title: string;
  detail: string;
};

// ─── Exercise Recommendation Engine ──────────────────────────────────────────

/**
 * What the engine recommends doing next session for a given exercise.
 * Derived from trend, interpretation status, and double-progression state.
 */
export type ExerciseRecommendationAction =
  | "increase_load"   // push more weight next session
  | "increase_reps"   // same weight, aim for more reps
  | "hold"            // repeat current load/rep range
  | "reduce_load"     // step back on weight, rebuild
  | "deload"          // significant reduction — sustained regression detected
  | "form_focus"      // fix execution quality before adding load
  | "new";            // no history yet

/**
 * 4-state roll-up of exercise progression state.
 * Simpler than ProgressionStatus — intended for UI and action routing.
 */
export type ExerciseRecommendationStatus =
  | "progressing"
  | "stagnating"
  | "regressing"
  | "new";

/**
 * Single structured output of the Exercise Recommendation Engine.
 * One object per exercise — contains everything needed for in-workout hints,
 * progression cards, and future plan-builder integration.
 */
export type ExerciseCoachRecommendation = {
  exerciseName: string;
  /** Recommended load for next session. Null only when no history exists. */
  targetWeight: number | null;
  /** Structured rep targets — never stored as a string. */
  targetRepsMin: number;
  targetRepsMax: number;
  /** Set count recommendation — omitted when not determinable. */
  targetSets?: number;
  /** Set volume direction: only emitted at medium/high confidence. */
  setAction?: "hold_sets" | "add_set" | "reduce_set";
  /** Short UI-ready explanation for the set recommendation. */
  setReason?: string;
  action: ExerciseRecommendationAction;
  status: ExerciseRecommendationStatus;
  /** Single confidence model: 0–2 sessions → low, 3 → medium, 4+ → high. */
  confidence: "low" | "medium" | "high";
  /** Short, UI-ready explanation of why this recommendation was made. */
  reason: string;
  /** Longer personalised coaching message — only present when UserProfile is provided. */
  coachMessage?: string;
};

// ─── Backward-compat alias ────────────────────────────────────────────────────

export type Workout = WorkoutSession;

// ─── XP / Level / Streak ──────────────────────────────────────────────────────

export type XpEventType =
  | "daily_login"        // legacy — kept for old DB rows, no longer awarded
  | "daily_check_in"     // training day check-in (5 XP)
  | "rest_day_check_in"
  | "workout_completed"
  | "pr_achieved"
  | "streak_extended";

export interface UserProgression {
  userId: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
}

export interface XpEvent {
  id: string;
  userId: string;
  eventType: XpEventType;
  xpAmount: number;
  eventDate: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
