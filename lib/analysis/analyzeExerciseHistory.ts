import type { ExerciseSession, ExerciseAnalysisResult } from "@/app/types";
import { calculateEpley1RM } from "@/lib/analysis/exerciseMetrics";
import { computeNextTarget } from "@/app/lib/recommendations";
import { interpretProgression } from "@/lib/analysis/interpretProgression";

// ── Per-session classification thresholds ────────────────────────────────────
const E1RM_CLEARLY_UP   =  0.015;  // >= +1.5%
const E1RM_SLIGHTLY_UP  =  0.005;  // >= +0.5%
const E1RM_FLAT_LOW     = -0.010;  // flat band: >= -1.0%
const E1RM_FLAT_HIGH    =  0.010;  // flat band: <= +1.0%
const E1RM_CLEARLY_DOWN = -0.015;  // <= -1.5%

function getConfidence(count: number): "low" | "medium" | "high" {
  if (count >= 3) return "high";
  if (count === 2) return "medium";
  return "low";
}

function buildReason(
  current: ExerciseSession,
  previous: ExerciseSession | undefined,
  trend: "progressing" | "mixed" | "stagnating" | "regressing",
  e1RMDeltaPct: number | null,
): string {
  if (!previous) return "First session recorded";

  const wDiff = +(current.topWeight - previous.topWeight).toFixed(2);
  const rDiff = current.topReps - previous.topReps;

  if (trend === "progressing") {
    if (wDiff > 0) return `+${wDiff} kg vs last session`;
    if (wDiff === 0 && rDiff > 0) return `Same weight, +${rDiff} rep${rDiff > 1 ? "s" : ""}`;
    if (wDiff < 0 && rDiff > 0) return `−${Math.abs(wDiff)} kg, +${rDiff} reps — e1RM up`;
    if (e1RMDeltaPct !== null)
      return `e1RM up ${(e1RMDeltaPct * 100).toFixed(1)}% vs previous`;
  }

  if (trend === "mixed") {
    if (wDiff > 0 && e1RMDeltaPct !== null)
      return `+${wDiff} kg, but e1RM down ${Math.abs(e1RMDeltaPct * 100).toFixed(1)}%`;
    return `Heavier load, lower estimated strength`;
  }

  if (trend === "regressing") {
    if (wDiff < 0) return `${wDiff} kg vs last session`;
    if (rDiff <= -2) return `Same weight, ${rDiff} reps vs last session`;
    if (e1RMDeltaPct !== null)
      return `e1RM down ${Math.abs(e1RMDeltaPct * 100).toFixed(1)}% vs previous`;
  }

  // stagnating
  if (wDiff === 0 && rDiff === 0) {
    return "Same top set as last session";
  }
  return "Performance similar to last session";
}

/**
 * Analyses chronological exercise session history (oldest → newest) and
 * returns a rich ExerciseAnalysisResult for the given exercise.
 *
 * Confidence: low = 1 session, medium = 2, high = 3+.
 * Uses last 5 sessions max.
 */
export function analyzeExerciseHistory(
  sessions: ExerciseSession[],
  exerciseName: string,
): ExerciseAnalysisResult {
  const relevant = sessions.slice(-5);
  const confidence = getConfidence(relevant.length);

  const empty: ExerciseAnalysisResult = {
    exerciseName,
    trend: "stagnating",
    reason: "No session data",
    currentE1RM: null,
    previousE1RM: null,
    volumeDeltaPct: null,
    suggestedNextWeight: null,
    suggestedRepRange: null,
    confidence: "low",
    bestWeight: null,
    lastTopSet: null,
  };
  if (relevant.length === 0) return empty;

  const current  = relevant[relevant.length - 1];
  const previous = relevant.length >= 2 ? relevant[relevant.length - 2] : undefined;

  const currentE1RM  = calculateEpley1RM(current.topWeight, current.topReps) || null;
  const previousE1RM = previous
    ? calculateEpley1RM(previous.topWeight, previous.topReps) || null
    : null;

  const e1RMDelta =
    currentE1RM && previousE1RM ? (currentE1RM - previousE1RM) / previousE1RM : null;

  // Volume delta: requires same workout context to be meaningful.
  // ExerciseSession has no context field (trainingDayIndex etc.) to verify this,
  // so we omit the delta to avoid misleading cross-context comparisons.
  const volumeDeltaPct = null;

  // ── Trend classification ─────────────────────────────────────────────────────
  // Explicit signal-based rules. Evaluated in priority order.

  const loadPR        = previous ? current.topWeight > previous.topWeight : false;
  const repPRSameLoad = previous
    ? current.topWeight === previous.topWeight && current.topReps > previous.topReps
    : false;

  const e1rmClearlyUp  = e1RMDelta !== null && e1RMDelta >= E1RM_CLEARLY_UP;
  const e1rmSlightlyUp = e1RMDelta !== null && e1RMDelta >= E1RM_SLIGHTLY_UP;
  const e1rmFlat       =
    e1RMDelta !== null && e1RMDelta >= E1RM_FLAT_LOW && e1RMDelta <= E1RM_FLAT_HIGH;
  const e1rmClearlyDown = e1RMDelta !== null && e1RMDelta <= E1RM_CLEARLY_DOWN;

  let trend: "progressing" | "mixed" | "stagnating" | "regressing";

  if (!previous) {
    trend = "stagnating";
  } else if (repPRSameLoad || e1rmClearlyUp || (loadPR && e1rmSlightlyUp)) {
    // 1. Progressing: rep PR at same load, or e1RM clearly up, or heavier load + e1RM up
    trend = "progressing";
  } else if (loadPR) {
    // 2. Mixed: heavier load achieved but e1RM didn't improve (conflicting signals)
    trend = "mixed";
  } else if (!loadPR && !repPRSameLoad && e1rmFlat) {
    // 3. Plateau: no load/rep PR and e1RM flat
    trend = "stagnating";
  } else if (!loadPR && !repPRSameLoad && e1rmClearlyDown) {
    // 4. Declining: no load/rep PR and e1RM clearly down
    trend = "regressing";
  } else {
    trend = "stagnating";
  }

  const reason = buildReason(current, previous, trend, e1RMDelta);
  const bestWeight = Math.max(...relevant.map((s) => s.topWeight));

  // ── Coaching interpretation ───────────────────────────────────────────────
  const e1rmSeries = relevant.map((s) => calculateEpley1RM(s.topWeight, s.topReps));
  const interpretation = interpretProgression(e1rmSeries);

  // Map to legacy trend format for computeNextTarget
  const legacyTrend =
    trend === "progressing" ? "up"
    : trend === "regressing" ? "down"
    : trend === "mixed" ? "flat"
    : "flat";
  const nextTarget = computeNextTarget(relevant, legacyTrend);

  const suggestedRepRange = nextTarget
    ? nextTarget.repsMin === nextTarget.repsMax
      ? `${nextTarget.repsMin}`
      : `${nextTarget.repsMin}–${nextTarget.repsMax}`
    : null;

  return {
    exerciseName,
    trend,
    reason,
    currentE1RM: currentE1RM ? +currentE1RM.toFixed(1) : null,
    previousE1RM: previousE1RM ? +previousE1RM.toFixed(1) : null,
    volumeDeltaPct,
    suggestedNextWeight: nextTarget?.weight ?? null,
    suggestedRepRange,
    confidence,
    bestWeight: bestWeight > 0 ? bestWeight : null,
    lastTopSet: current.topWeight > 0 ? { weight: current.topWeight, reps: current.topReps } : null,
    interpretation,
  };
}
