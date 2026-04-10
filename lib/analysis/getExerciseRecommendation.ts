import type {
  ExerciseSession,
  UserProfile,
  ProgressionStatus,
  ExerciseCoachRecommendation,
  ExerciseRecommendationAction,
  ExerciseRecommendationStatus,
} from "@/app/types";
import { analyzeExerciseHistory } from "@/lib/analysis/analyzeExerciseHistory";
import { computeNextTarget, getIncrement } from "@/app/lib/recommendations";
import { getSmartRecommendation } from "@/lib/analysis/smartCoach";
import { findBuiltIn } from "@/app/constants/exercises";

// ── Input ─────────────────────────────────────────────────────────────────────

export type GetExerciseRecommendationInput = {
  exerciseName: string;
  /**
   * Chronological ExerciseSession array (oldest → newest).
   * Must contain only completed working sets.
   * Use getExerciseSessionsFromHistory() or the sessions from useProgression.
   */
  sessions: ExerciseSession[];
  /** Double-progression rep range from the template. Enables load-ceiling logic. */
  repRange?: { min: number; max: number };
  /** Optional — enables personalised coachMessage output. */
  profile?: UserProfile;
  /** Muscle groups for this exercise — used with muscleGroupContext. */
  muscleGroups?: string[];
  /** Per-muscle-group load context from computeMuscleGroupLoadMap(). */
  muscleGroupContext?: Record<string, "low" | "medium" | "high">;
};

// ── Unified confidence model ───────────────────────────────────────────────────
//
// Single authoritative scale for this engine.
// More conservative than analyzeExerciseHistory (which treats 3+ as high).
// Matches interpretProgression's scale.
//
//   0–2 sessions → "low"   (not enough data for reliable signal)
//   3   sessions → "medium"
//   4+  sessions → "high"

function unifiedConfidence(sessionCount: number): "low" | "medium" | "high" {
  if (sessionCount >= 4) return "high";
  if (sessionCount === 3) return "medium";
  return "low";
}

// ── Status mapping ────────────────────────────────────────────────────────────

function mapStatus(
  interpStatus: ProgressionStatus | undefined,
  sessionCount: number,
): ExerciseRecommendationStatus {
  if (sessionCount === 0) return "new";
  if (!interpStatus) return "stagnating";
  if (interpStatus === "progressing" || interpStatus === "improving_slightly")
    return "progressing";
  if (interpStatus === "regressing") return "regressing";
  // stable | stalling | fatigue_dip → stagnating
  return "stagnating";
}

// ── Action derivation ─────────────────────────────────────────────────────────
//
// Rules:
// - Compare nextTarget weight/reps vs last session to detect the direction.
// - fatigue_dip → always hold (don't push on a recovery session).
// - regressing → reduce_load or deload (high confidence only for deload).
// - All others: follow the computeNextTarget direction.

function deriveAction(
  interpStatus: ProgressionStatus | undefined,
  nextTargetWeight: number,
  lastWeight: number,
  nextRepsMax: number,
  lastReps: number,
  sessionCount: number,
  confidence: "low" | "medium" | "high",
): ExerciseRecommendationAction {
  if (sessionCount === 0) return "new";
  if (!interpStatus) return "hold";

  const weightGoesUp   = nextTargetWeight - lastWeight >  0.01;
  const weightGoesDown = nextTargetWeight - lastWeight < -0.01;
  // Use repsMax (not repsMin) to detect rep progression intent.
  // computeNextTarget returns { repsMin: r, repsMax: r+2 } for short plateaus —
  // the min stays the same but the ceiling rises, which IS a rep progression signal.
  const repsGoUp       = nextRepsMax > lastReps;

  switch (interpStatus) {
    case "progressing":
    case "improving_slightly":
    case "stable":
    case "stalling":
      // Follow the target: computeNextTarget already handled the right move
      // (rep ceiling → load increase; short plateau → more reps; etc.)
      if (weightGoesUp)  return "increase_load";
      if (repsGoUp)      return "increase_reps";
      return "hold";

    case "fatigue_dip":
      // Hold unconditionally — recovery session, no push
      return "hold";

    case "regressing":
      if (weightGoesDown) {
        // Only escalate to "deload" when the signal is sustained and confident
        return confidence === "high" ? "deload" : "reduce_load";
      }
      // interpretProgression signals regression from the multi-session e1RM trend —
      // it can lead computeNextTarget by 1–2 sessions because it uses a tighter
      // detection threshold (0.8% vs 1.5%). At medium/high confidence the signal
      // is real enough to act on even before the weight recommendation drops.
      if (confidence !== "low") return "reduce_load";
      return "hold";
  }
}

// ── Set recommendation ────────────────────────────────────────────────────────
//
// Conservative v1 — only two states emitted:
//   reduce_set: tied exclusively to deload (strongest, most reliable signal)
//   hold_sets:  default when set count is known and no reduction is warranted
//
// add_set intentionally omitted: without muscle-group volume context or profile
// data, recommending an extra set is speculation rather than coaching.

type SetRec = {
  setAction: "hold_sets" | "reduce_set";
  targetSets: number;
  setReason: string;
};

function deriveSetRecommendation(
  action: ExerciseRecommendationAction,
  lastSetCount: number,
  confidence: "low" | "medium" | "high",
): SetRec | undefined {
  // Need enough data to trust the signal; need at least one logged set.
  if (confidence === "low" || lastSetCount <= 0) return undefined;

  if (action === "deload" && lastSetCount >= 3) {
    return {
      setAction:  "reduce_set",
      targetSets: lastSetCount - 1,
      setReason:  "Deload — drop a set and rebuild with clean, controlled reps.",
    };
  }

  return {
    setAction:  "hold_sets",
    targetSets: lastSetCount,
    setReason:  "Set count is working — keep it consistent.",
  };
}

// ── Reason builder ────────────────────────────────────────────────────────────
//
// Short, UI-ready strings. No technical jargon. No percentages.
// Always returns something meaningful — never empty.

function buildReason(
  action: ExerciseRecommendationAction,
  interpStatus: ProgressionStatus | undefined,
  sessionCount: number,
): string {
  if (sessionCount === 0) {
    return "No history yet — log your first session to begin tracking.";
  }
  if (sessionCount < 3) {
    return "Not enough history yet for a confident adjustment.";
  }

  switch (action) {
    case "new":
      return "No history yet — log your first session to begin tracking.";

    case "increase_load":
      if (interpStatus === "progressing")        return "Strength trending up — add weight and keep the momentum.";
      if (interpStatus === "improving_slightly") return "Progress accumulating — a small weight increase is due.";
      if (interpStatus === "stalling")           return "Rep ceiling reached — time to step up the weight.";
      if (interpStatus === "stable")             return "Holding strong at the rep ceiling — ready for a load increase.";
      return "Rep range complete — load increase is the next step.";

    case "increase_reps":
      if (interpStatus === "progressing")        return "On track — push for more reps before adding weight.";
      if (interpStatus === "improving_slightly") return "Gradual progress building — keep adding reps.";
      if (interpStatus === "stalling")           return "Weight is stable — build reps to reach the next load increase.";
      if (interpStatus === "stable")             return "Holding steady — push for another rep to move forward.";
      return "Keep the load and build reps towards the ceiling.";

    case "hold":
      if (interpStatus === "fatigue_dip")  return "Recent dip after prior gains — hold load and let performance stabilize.";
      if (interpStatus === "stalling")     return "Recent sessions varied — keep the load steady for now.";
      if (interpStatus === "stable")       return "Performance steady — hold load and consolidate reps.";
      if (interpStatus === "regressing")   return "Performance declining — hold load and focus on quality reps.";
      return "No clear direction yet — hold and see how the next session goes.";

    case "reduce_load":
      if (interpStatus === "regressing")   return "Output declining — reduce load and rebuild with quality reps.";
      return "Performance dropped below target — reduce load and reset.";

    case "deload":
      return "Sustained decline across sessions — deload and reset before the next push.";

    case "form_focus":
      return "Focus on movement quality before adding load.";
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Central Exercise Recommendation Engine — v1.
 *
 * Consolidates analyzeExerciseHistory, interpretProgression, and
 * computeNextTarget into a single structured output per exercise.
 *
 * Inputs:
 *   - sessions: completed working sets only (oldest → newest)
 *   - repRange: enables double-progression ceiling logic
 *   - profile:  enables personalised coachMessage (optional)
 *
 * Guarantees:
 *   - targetRepsMin/Max are always numbers (no string parsing)
 *   - confidence uses one unified model across all layers
 *   - warm-up sets are never included (responsibility of the caller)
 *   - conservative: low confidence when < 3 sessions
 */
export function getExerciseRecommendation(
  input: GetExerciseRecommendationInput,
): ExerciseCoachRecommendation {
  const {
    exerciseName,
    sessions,
    repRange,
    profile,
    muscleGroups,
    muscleGroupContext,
  } = input;

  // ── Defensive filter ──────────────────────────────────────────────────────
  // Strip sessions that are missing valid top-set data. The standard pipeline
  // (getExerciseSessionsFromHistory / useProgression) guarantees topWeight > 0
  // and topReps > 0, but direct callers may bypass that extraction.
  // This prevents the engine from producing recommendations based on zero-weight
  // or zero-rep ghost sessions.
  const validSessions = sessions.filter((s) => s.topWeight > 0 && s.topReps > 0);

  // ── No history case ────────────────────────────────────────────────────────
  if (validSessions.length === 0) {
    return {
      exerciseName,
      targetWeight:  null,
      targetRepsMin: repRange?.min ?? 8,
      targetRepsMax: repRange?.max ?? 12,
      action:     "new",
      status:     "new",
      confidence: "low",
      reason:     "No history yet — log your first session to begin tracking.",
    };
  }

  // ── Analysis ───────────────────────────────────────────────────────────────
  // analyzeExerciseHistory handles: e1RM, trend classification, interpretProgression,
  // and computeNextTarget internally. We call it once for all derived signals.
  const analysis  = analyzeExerciseHistory(validSessions, exerciseName, repRange);
  const relevant  = validSessions.slice(-5);
  const last      = relevant[relevant.length - 1];
  const confidence = unifiedConfidence(relevant.length);

  // ── Structured target (avoid string parsing) ────────────────────────────────
  // computeNextTarget is also called inside analyzeExerciseHistory, but that
  // result is serialised into a display string. We call it directly here to
  // retain structured { repsMin, repsMax } without any regex parsing.
  const trendKey =
    analysis.trend === "progressing" ? ("up"   as const) :
    analysis.trend === "regressing"  ? ("down" as const) :
    analysis.trend === "mixed"       ? ("mixed" as const) :
                                        ("flat" as const);

  const builtIn   = findBuiltIn(exerciseName);
  const inc       = builtIn?.equipment ? getIncrement(builtIn.equipment) : 2.5;
  const dpOptions =
    repRange && repRange.min > 0 && repRange.max > repRange.min
      ? {
          repRangeMin: repRange.min,
          repRangeMax: repRange.max,
          increment:   inc,
        }
      : undefined;

  const nextTarget = computeNextTarget(relevant, trendKey, dpOptions);

  // Safe fallback: echo last session when computeNextTarget returns null
  // (should only happen when last.topWeight === 0, which getExerciseSessions filters out)
  const targetWeight  = nextTarget?.weight  ?? last.topWeight;
  const targetRepsMin = nextTarget?.repsMin ?? last.topReps;
  const targetRepsMax = nextTarget?.repsMax ?? last.topReps;

  // ── Interpretation status ──────────────────────────────────────────────────
  const interpStatus = analysis.interpretation?.status;

  // ── Action ────────────────────────────────────────────────────────────────
  const action = deriveAction(
    interpStatus,
    targetWeight,
    last.topWeight,
    targetRepsMax,   // repsMax signals the ceiling intent from computeNextTarget
    last.topReps,
    relevant.length,
    confidence,
  );

  // ── reduce_load target correction ────────────────────────────────────────
  // computeNextTarget works from analyzeExerciseHistory.trend (threshold: −1.5%)
  // while interpStatus comes from interpretProgression (threshold: −0.8%).
  // When reduce_load is triggered by the interpretation signal alone, trendKey
  // may be "flat" or "up" — so computeNextTarget can return the same or higher
  // weight. Step back by one equipment increment to align action and target.
  const adjustedTargetWeight =
    action === "reduce_load" && targetWeight >= last.topWeight
      ? Math.max(+(last.topWeight - inc).toFixed(2), inc)
      : targetWeight;

  // ── Set recommendation ────────────────────────────────────────────────────
  const setRec = deriveSetRecommendation(action, last.setCount, confidence);

  // ── Status ────────────────────────────────────────────────────────────────
  const status = mapStatus(interpStatus, relevant.length);

  // ── Reason ────────────────────────────────────────────────────────────────
  const reason = buildReason(action, interpStatus, relevant.length);

  // ── Optional coach message ────────────────────────────────────────────────
  // Only computed when profile is provided — uses getSmartRecommendation which
  // takes into account experience, goal, sleepQuality, and muscle-group load.
  let coachMessage: string | undefined;
  if (profile && analysis.interpretation) {
    coachMessage = getSmartRecommendation({
      interpretation:    analysis.interpretation,
      profile,
      metrics: {
        suggestedNextWeight: adjustedTargetWeight,
        // getSmartRecommendation expects a string here (existing API) — one
        // controlled conversion point; all internal logic uses numbers above.
        suggestedRepRange:
          targetRepsMin === targetRepsMax
            ? `${targetRepsMin}`
            : `${targetRepsMin}–${targetRepsMax}`,
        confidence,
      },
      recentSessions:    relevant,
      muscleGroups,
      muscleGroupContext,
    });
  }

  return {
    exerciseName,
    targetWeight: adjustedTargetWeight,
    targetRepsMin,
    targetRepsMax,
    targetSets: setRec?.targetSets,
    setAction:  setRec?.setAction,
    setReason:  setRec?.setReason,
    action,
    status,
    confidence,
    reason,
    coachMessage,
  };
}
