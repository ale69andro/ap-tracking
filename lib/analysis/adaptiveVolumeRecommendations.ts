/**
 * Adaptive Volume Recommendation Layer
 *
 * Translates MuscleAdaptiveVolumeInsight[] (from adaptiveVolume.ts) into
 * short, honest coaching recommendations expressed in weekly hard sets.
 *
 * Design principles:
 * - Conservative: small adjustments only (2–4 sets max)
 * - Honest: no prescription when confidence is low
 * - Coach-voiced: actionable language, no raw volume numbers to users
 * - Pure: no side effects, no DB, no hooks
 *
 * Guardrail layer (applyAdaptiveVolumeGuardrails) sits between base logic and
 * final output. It overrides directionally correct but contextually dumb
 * recommendations (e.g. "add sets" when sets are already high).
 *
 * Input:  MuscleAdaptiveVolumeInsight[] + ExerciseProgression[]
 * Output: MuscleAdaptiveVolumeRecommendation[] (one per muscle)
 */

import type {
  ExerciseProgression, // used by buildWeeklyMuscleSetSummaries
  MuscleAdaptiveVolumeInsight,
  MuscleAdaptiveVolumeRecommendation,
  AdaptiveVolumeActionType,
  AdaptiveVolumeZone,
  AdaptiveVolumeConfidence,
} from "@/app/types";
import { toMainGroup } from "./getWeeklyVolumeByMuscleGroup";

// ─── Date Helper ──────────────────────────────────────────────────────────────

/**
 * Returns the Monday of the week containing the given date string ("YYYY-MM-DD"),
 * parsed as local date to avoid UTC midnight shift.
 */
function getMondayKey(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  const dayOfWeek = date.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMondayKey(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Weekly Set Count ─────────────────────────────────────────────────────────

/**
 * Counts hard working sets completed per muscle group in the current ISO week.
 *
 * Uses the same primary-muscle attribution as the volume engine (first match
 * via toMainGroup, no double-counting). setCount comes directly from the
 * ExerciseSession, which already reflects only completed working sets.
 *
 * Returns a map of { muscle → weeklySetCount }.
 */
export function buildWeeklyMuscleSetSummaries(
  progressions: ExerciseProgression[],
): Record<string, number> {
  const currentWeekKey = getCurrentMondayKey();
  const setSums: Record<string, number> = {};

  for (const prog of progressions) {
    const muscle = toMainGroup(prog.muscleGroups);
    if (!muscle) continue;

    for (const session of prog.recentSessions) {
      if (getMondayKey(session.date) !== currentWeekKey) continue;
      setSums[muscle] = (setSums[muscle] ?? 0) + session.setCount;
    }
  }

  return setSums;
}

// ─── Action + Adjustment Derivation ──────────────────────────────────────────

/**
 * Maps zone × confidence to a coaching action and a signed set adjustment.
 *
 * Set adjustment is signed: positive = add, negative = reduce, null = no prescription.
 *
 * Rules:
 * - unknown → collect_more_data regardless of confidence
 * - below + low → collect_more_data (insufficient confidence to prescribe)
 * - below + medium → add_sets +2
 * - below + high → add_sets +3  (recommendation text says "2–4")
 * - optimal → hold, null
 * - above + low → collect_more_data
 * - above + medium → reduce_sets -2
 * - above + high → reduce_sets -3  (recommendation text says "2–4")
 */
export function getSetAdjustmentForInsight(
  zone: AdaptiveVolumeZone,
  confidence: AdaptiveVolumeConfidence,
): { action: AdaptiveVolumeActionType; setAdjustment: number | null } {
  if (zone === "unknown") {
    return { action: "collect_more_data", setAdjustment: null };
  }

  if (zone === "optimal") {
    return { action: "hold", setAdjustment: null };
  }

  // Low confidence → never prescribe a change
  if (confidence === "low") {
    return { action: "collect_more_data", setAdjustment: null };
  }

  if (zone === "below") {
    return {
      action: "add_sets",
      setAdjustment: confidence === "high" ? 3 : 2,
    };
  }

  // zone === "above"
  return {
    action: "reduce_sets",
    setAdjustment: confidence === "high" ? -3 : -2,
  };
}

// ─── Recommendation Text ──────────────────────────────────────────────────────

function buildReasonString(
  zone: AdaptiveVolumeZone,
  confidence: AdaptiveVolumeConfidence,
): string {
  switch (zone) {
    case "below":
      return `Volume below estimated effective range (${confidence} confidence)`;
    case "above":
      return `Volume above estimated effective range (${confidence} confidence)`;
    case "optimal":
      return `Volume within estimated effective range`;
    case "unknown":
      return "Not enough comparable training weeks to estimate a range";
  }
}

function buildRecommendationString(
  muscle: string,
  zone: AdaptiveVolumeZone,
  confidence: AdaptiveVolumeConfidence,
): string {
  const m = muscle;
  const ml = muscle.toLowerCase();

  if (zone === "unknown" || confidence === "low") {
    return `Not enough stable ${ml} data yet — keep training consistently.`;
  }

  if (zone === "optimal") {
    return `${m} volume is within your best recent range — keep it steady.`;
  }

  if (zone === "below") {
    if (confidence === "high") {
      return `${m} volume looks low — consider adding 2–4 hard sets next week.`;
    }
    // medium
    return `${m} volume may be slightly low — try adding 2 sets next week.`;
  }

  // zone === "above"
  if (confidence === "high") {
    return `${m} volume may be above your best recent range — consider removing 2–4 sets.`;
  }
  // medium
  return `${m} workload looks slightly high — reduce by 2 sets and monitor recovery.`;
}

// ─── Guardrail Thresholds ─────────────────────────────────────────────────────

/**
 * Large groups can absorb more weekly sets before hitting overreach territory.
 * Chest / Back / Legs are compound-dominant and recover across more muscle mass.
 */
const LARGE_MUSCLE_GROUPS = new Set(["Chest", "Back", "Legs"]);

/**
 * Weekly sets at or above this threshold block an "add_sets" recommendation.
 * Directional signal may be correct, but loading more on a full week risks overreaching.
 * These are pragmatic guardrails — not scientific MEV/MAV landmarks.
 */
const ADD_BLOCK_SETS = { large: 16, small: 12 } as const;

/**
 * Weekly sets at or below this threshold block a "reduce_sets" recommendation.
 * Volume may read "above range" but there's too little absolute work to cut further.
 */
const REDUCE_BLOCK_SETS = { large: 6, small: 4 } as const;

/**
 * Weekly sets at or below this threshold trigger softened language.
 * The week is too young — or the exposure too limited — for a confident directional call.
 */
const EARLY_STAGE_SETS = { large: 2, small: 1 } as const;

/**
 * Returns per-muscle guardrail thresholds based on whether the group is large or small.
 */
export function getMuscleSetThresholds(muscle: string): {
  addBlock: number;
  reduceBlock: number;
  earlyStage: number;
} {
  const isLarge = LARGE_MUSCLE_GROUPS.has(muscle);
  return {
    addBlock: isLarge ? ADD_BLOCK_SETS.large : ADD_BLOCK_SETS.small,
    reduceBlock: isLarge ? REDUCE_BLOCK_SETS.large : REDUCE_BLOCK_SETS.small,
    earlyStage: isLarge ? EARLY_STAGE_SETS.large : EARLY_STAGE_SETS.small,
  };
}

// ─── Guardrail Application ────────────────────────────────────────────────────

/**
 * Applies contextual safety guardrails to a base recommendation.
 *
 * Guardrails (in priority order):
 * 1. High-set add cap   — blocks "add_sets" when current sets are already at the ceiling
 * 2. Low-set reduce floor — blocks "reduce_sets" when sets are already minimal
 * 3. Early-stage caution — softens language when too few sets logged to be confident
 *
 * Low-confidence is already handled upstream in getSetAdjustmentForInsight.
 * This layer deals only with current-week set count context.
 *
 * If currentWeeklySets is undefined (caller did not provide set data), all
 * set-based guardrails are skipped and base is returned unchanged. This is
 * distinct from an explicit 0, which is valid real data and will activate
 * the early-stage and floor guardrails as normal.
 *
 * Returns a new recommendation object; does not mutate the input.
 */
export function applyAdaptiveVolumeGuardrails(
  base: MuscleAdaptiveVolumeRecommendation,
  currentWeeklySets: number | undefined,
): MuscleAdaptiveVolumeRecommendation {
  // No set data provided — skip all set-based guardrails entirely.
  if (currentWeeklySets === undefined) return base;

  const { muscle } = base;
  const m = muscle;
  const { addBlock, reduceBlock, earlyStage } = getMuscleSetThresholds(muscle);

  // ── Guardrail 1: High-set add cap ─────────────────────────────────────────
  // Do not pile more volume on a muscle that is already at its weekly ceiling.
  if (base.action === "add_sets" && currentWeeklySets >= addBlock) {
    return {
      ...base,
      action: "hold",
      setAdjustment: null,
      reason: `${base.reason} — weekly set count already at ceiling (${currentWeeklySets} sets)`,
      recommendation: `${m} signal points low, but weekly sets are already high — hold steady for now.`,
    };
  }

  // ── Guardrail 2: Low-set reduce floor ────────────────────────────────────
  // Do not cut volume that is already minimal, even if the signal points "above".
  if (base.action === "reduce_sets" && currentWeeklySets <= reduceBlock) {
    return {
      ...base,
      action: "hold",
      setAdjustment: null,
      reason: `${base.reason} — but weekly set count is already very low (${currentWeeklySets} sets)`,
      recommendation: `${m} volume may read high, but current weekly sets are already low — keep it steady.`,
    };
  }

  // ── Guardrail 3: Early-stage caution ─────────────────────────────────────
  // The week hasn't accumulated enough exposure for a confident call.
  // Keep the action direction but soften the language; do NOT null the setAdjustment.
  if (
    currentWeeklySets <= earlyStage &&
    (base.action === "add_sets" || base.action === "reduce_sets")
  ) {
    const softenedRecommendation =
      base.action === "add_sets"
        ? `${m} volume looks light so far — reassess after more sessions this week.`
        : `${m} workload looks elevated, but it's early this week — reassess before adjusting.`;
    return {
      ...base,
      recommendation: softenedRecommendation,
    };
  }

  return base;
}

// ─── Single-Muscle Recommendation ────────────────────────────────────────────

/**
 * Converts one MuscleAdaptiveVolumeInsight into a coaching recommendation,
 * then applies contextual guardrails using the current week's set count.
 *
 * @param insight           - Output of getAdaptiveVolumeInsights() for one muscle
 * @param currentWeeklySets - Hard working sets logged this week for this muscle.
 *                            Pass `undefined` (or omit) when no set data is available —
 *                            guardrails will not fire. Pass `0` for a real zero-set week.
 */
export function getAdaptiveVolumeRecommendation(
  insight: MuscleAdaptiveVolumeInsight,
  currentWeeklySets?: number,
): MuscleAdaptiveVolumeRecommendation {
  const { zone, confidence } = insight;
  const { action, setAdjustment } = getSetAdjustmentForInsight(zone, confidence);

  const base: MuscleAdaptiveVolumeRecommendation = {
    muscle: insight.muscle,
    action,
    setAdjustment,
    confidence,
    reason: buildReasonString(zone, confidence),
    recommendation: buildRecommendationString(insight.muscle, zone, confidence),
  };

  return applyAdaptiveVolumeGuardrails(base, currentWeeklySets);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Converts the full set of adaptive volume insights into per-muscle coaching
 * recommendations expressed in weekly hard sets, with guardrails applied.
 *
 * @param insights                 - Output of getAdaptiveVolumeInsights()
 * @param currentWeeklySetsByMuscle - Map of { muscle → current week set count },
 *                                    from buildWeeklyMuscleSetSummaries().
 *                                    Omit entirely to skip all set-based guardrails.
 *                                    A muscle absent from the map also skips guardrails
 *                                    for that muscle — this is intentional: absent ≠ zero.
 */
export function getAdaptiveVolumeRecommendations(
  insights: MuscleAdaptiveVolumeInsight[],
  currentWeeklySetsByMuscle?: Record<string, number>,
): MuscleAdaptiveVolumeRecommendation[] {
  return insights.map((insight) =>
    getAdaptiveVolumeRecommendation(
      insight,
      currentWeeklySetsByMuscle?.[insight.muscle],
    ),
  );
}
