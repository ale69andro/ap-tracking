import type { ExerciseSession, ExerciseAnalysisResult } from "@/app/types";
import { calculateEpley1RM } from "@/lib/analysis/exerciseMetrics";
import { computeNextTarget } from "@/app/lib/recommendations";

const MIN_PROGRESS_PCT = 0.01;   // > 1% e1RM gain  → progressing
const MIN_REGRESS_PCT  = 0.015;  // > 1.5% e1RM loss → regressing

function getConfidence(count: number): "low" | "medium" | "high" {
  if (count >= 3) return "high";
  if (count === 2) return "medium";
  return "low";
}

function buildReason(
  current: ExerciseSession,
  previous: ExerciseSession | undefined,
  trend: "progressing" | "stagnating" | "regressing",
  e1RMDeltaPct: number | null,
  sessionCount: number,
): string {
  if (!previous) return "First session recorded";

  const wDiff = +(current.topWeight - previous.topWeight).toFixed(2);
  const rDiff = current.topReps - previous.topReps;

  if (trend === "progressing") {
    if (wDiff > 0) return `+${wDiff} kg vs last session`;
    if (rDiff > 0) return `Same weight, +${rDiff} rep${rDiff > 1 ? "s" : ""}`;
    if (e1RMDeltaPct !== null)
      return `e1RM up ${(e1RMDeltaPct * 100).toFixed(1)}% vs previous`;
  }

  if (trend === "regressing") {
    if (wDiff < 0) return `${wDiff} kg vs last session`;
    if (rDiff <= -2) return `Same weight, ${rDiff} reps vs last session`;
    if (e1RMDeltaPct !== null)
      return `e1RM down ${Math.abs(e1RMDeltaPct * 100).toFixed(1)}% vs previous`;
  }

  // stagnating
  if (wDiff === 0 && rDiff === 0) {
    return sessionCount >= 3
      ? `Top set unchanged across ${sessionCount} sessions`
      : "Same weight and reps vs last session";
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

  const wDiff = previous ? +(current.topWeight - previous.topWeight).toFixed(2) : 0;
  const rDiff = previous ? current.topReps - previous.topReps : 0;

  const volumeDeltaPct =
    previous && previous.totalVolume > 0
      ? Math.round(((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100)
      : null;

  // ── Trend classification ─────────────────────────────────────────────────────
  // e1RM is the primary signal; weight/reps direction is secondary fallback only.
  let trend: "progressing" | "stagnating" | "regressing";

  if (!previous) {
    trend = "stagnating";
  } else if (e1RMDelta !== null && e1RMDelta > MIN_PROGRESS_PCT) {
    // Primary: e1RM clearly improved
    trend = "progressing";
  } else if (e1RMDelta !== null && e1RMDelta < -MIN_REGRESS_PCT) {
    // Primary: e1RM clearly dropped
    trend = "regressing";
  } else {
    // Secondary: e1RM absent or inconclusive — fall back to weight/reps signals
    if (wDiff === 0 && rDiff > 0) {
      trend = "progressing";
    } else if (wDiff === 0 && rDiff <= -2) {
      trend = "regressing";
    } else {
      trend = "stagnating";
    }
  }

  const reason = buildReason(current, previous, trend, e1RMDelta, relevant.length);
  const bestWeight = Math.max(...relevant.map((s) => s.topWeight));

  // Map to legacy trend format for computeNextTarget
  const legacyTrend =
    trend === "progressing" ? "up" : trend === "regressing" ? "down" : "flat";
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
  };
}
