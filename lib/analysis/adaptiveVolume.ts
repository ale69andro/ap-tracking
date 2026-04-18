/**
 * Adaptive Volume Engine
 *
 * Estimates a user's likely effective weekly volume range per muscle group,
 * based on their own recent training history and performance signals.
 *
 * Design principles:
 * - Honest: returns "unknown" when data is insufficient.
 * - Range-based: outputs a range (min/max), never a precise point.
 * - Data-driven: uses only recent user-specific data, no generic prescriptions.
 * - Simple: robust heuristics > brittle precision.
 *
 * Input:  ExerciseProgression[] (from useProgression hook)
 * Output: MuscleAdaptiveVolumeInsight[] (one per trained muscle group)
 */

import type {
  ExerciseProgression,
  MuscleAdaptiveVolumeInsight,
  WeeklyMuscleSummary,
  AdaptiveVolumeZone,
  AdaptiveVolumeConfidence,
} from "@/app/types";
import { MUSCLE_TO_MAIN, toMainGroup } from "./getWeeklyVolumeByMuscleGroup";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Matches the NOISE threshold in interpretProgression.ts.
 * A performance delta within this band is treated as noise, not a real decline.
 */
const NOISE_THRESHOLD = 0.008; // 0.8%

/**
 * Minimum absolute delta required for a week to register as a real signal.
 * Weeks floating within ±0.3% are too ambiguous to classify as "good".
 * Tighter than NOISE_THRESHOLD — only small declines in the (-0.3%, 0%) band
 * are excluded by this guard.
 */
const MIN_SIGNAL_DELTA = 0.003; // 0.3%

/**
 * Fractional buffer applied to the trimmed range to soften threshold edges.
 * A 5% widen means a range of [8000, 12000] becomes [7600, 12600].
 */
const RANGE_WIDEN_FACTOR = 0.05;

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the Monday of the week containing the given date string ("YYYY-MM-DD").
 * Parses as local date to avoid UTC midnight shift.
 */
function getMondayKey(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns the Monday key for the current week. */
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

/**
 * Returns true if we're early enough in the week (Mon or Tue) that a low or
 * zero current-week volume is not yet meaningful as a training signal.
 */
function isEarlyInWeek(): boolean {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, …, 6=Sat
  return dayOfWeek === 1 || dayOfWeek === 2;
}

// ─── Step 1: Build Weekly Muscle Summaries ────────────────────────────────────

/**
 * Aggregates ExerciseProgression data into per-week, per-muscle summaries.
 *
 * For each exercise:
 * - Maps to its primary main muscle group (first match wins, no double-counting)
 * - Groups sessions by ISO week (Monday-anchored)
 * - Tracks best e1RM score and total volume per week
 *
 * For each (week, muscle) pair:
 * - volume = sum of all exercise volumes
 * - performanceDelta = avg e1RM % change vs each exercise's most recent prior week
 * - fatigueSignals = count of exercises with e1RM clearly below NOISE_THRESHOLD
 */
export function buildWeeklyMuscleSummaries(
  progressions: ExerciseProgression[],
): WeeklyMuscleSummary[] {
  // Per-exercise, per-week: { bestScore, totalVolume }
  type ExWeekData = { bestScore: number; totalVolume: number };
  const exerciseWeekMap = new Map<string, Map<string, ExWeekData>>();

  // Build the raw session map per exercise
  for (const prog of progressions) {
    if (!toMainGroup(prog.muscleGroups)) continue;

    const weekMap = new Map<string, ExWeekData>();
    exerciseWeekMap.set(prog.name, weekMap);

    for (const session of prog.recentSessions) {
      const weekKey = getMondayKey(session.date);
      const existing = weekMap.get(weekKey);
      if (!existing) {
        weekMap.set(weekKey, {
          bestScore: session.score,
          totalVolume: session.totalVolume,
        });
      } else {
        // Multiple sessions in the same week: keep best score, sum volumes
        weekMap.set(weekKey, {
          bestScore: Math.max(existing.bestScore, session.score),
          totalVolume: existing.totalVolume + session.totalVolume,
        });
      }
    }
  }

  // Collect all week keys across all exercises, sorted chronologically
  const allWeeks = new Set<string>();
  for (const weekMap of exerciseWeekMap.values()) {
    for (const weekKey of weekMap.keys()) allWeeks.add(weekKey);
  }
  const sortedWeeks = Array.from(allWeeks).sort();

  // Collect all muscles that have at least one session
  const activeMuscles = new Set<string>();
  for (const prog of progressions) {
    const m = toMainGroup(prog.muscleGroups);
    if (m) activeMuscles.add(m);
  }

  const summaries: WeeklyMuscleSummary[] = [];

  for (const muscle of activeMuscles) {
    // All exercises attributed to this muscle group
    const muscleExercises = progressions.filter(
      (p) => toMainGroup(p.muscleGroups) === muscle,
    );

    for (let i = 0; i < sortedWeeks.length; i++) {
      const weekKey = sortedWeeks[i];
      const prevWeekKey = i > 0 ? sortedWeeks[i - 1] : null;

      let totalVolume = 0;
      const deltas: number[] = [];
      let fatigueSignals = 0;

      for (const ex of muscleExercises) {
        const weekMap = exerciseWeekMap.get(ex.name);
        if (!weekMap) continue;

        const thisWeek = weekMap.get(weekKey);
        if (!thisWeek) continue; // Exercise not trained this week

        totalVolume += thisWeek.totalVolume;

        // Compute e1RM delta vs the most recent prior week this exercise was trained
        if (prevWeekKey !== null) {
          // Walk back to find the most recent prior week with data for this exercise
          let priorScore: number | null = null;
          for (let j = i - 1; j >= 0; j--) {
            const priorData = weekMap.get(sortedWeeks[j]);
            if (priorData) {
              priorScore = priorData.bestScore;
              break;
            }
          }
          if (priorScore !== null && priorScore > 0) {
            const delta = (thisWeek.bestScore - priorScore) / priorScore;
            deltas.push(delta);
            if (delta < -NOISE_THRESHOLD) fatigueSignals++;
          }
        }
      }

      if (totalVolume > 0) {
        const performanceDelta =
          deltas.length > 0
            ? deltas.reduce((a, b) => a + b, 0) / deltas.length
            : null;

        summaries.push({
          weekKey,
          muscle,
          volume: totalVolume,
          performanceDelta,
          fatigueSignals,
        });
      }
    }
  }

  return summaries;
}

// ─── Step 2: Identify Good Weeks ─────────────────────────────────────────────

/**
 * A "good week" for a muscle group requires all of:
 * - A valid performance comparison exists (not the first data point)
 * - Delta is above the minimum signal floor — excludes ambiguous near-zero weeks
 * - No exercises showed a clear fatigue/decline signal
 *
 * First weeks (performanceDelta === null) are always excluded. Without a prior
 * week to compare against, there is no evidence this volume drove performance.
 */
function isGoodWeek(summary: WeeklyMuscleSummary): boolean {
  if (summary.performanceDelta === null) return false;
  return (
    summary.performanceDelta >= -MIN_SIGNAL_DELTA && summary.fatigueSignals === 0
  );
}

// ─── Step 3: Estimate Range ───────────────────────────────────────────────────

/**
 * Derives a likely effective volume range from the volumes of good weeks.
 * Returns null if fewer than 2 good weeks are available (not enough evidence).
 *
 * With 3+ good weeks, the single lowest and highest outliers are trimmed before
 * computing min/max — this prevents one unusually high or low week from
 * distorting the effective range. With exactly 2 weeks, both values are kept.
 *
 * The final range is widened by RANGE_WIDEN_FACTOR (±5%) to soften threshold
 * edges and avoid brittle boundary classifications.
 */
export function estimateAdaptiveVolumeRange(
  summaries: WeeklyMuscleSummary[],
): { min: number; max: number } | null {
  const goodWeeks = summaries.filter(isGoodWeek);
  if (goodWeeks.length < 2) return null;

  const sorted = [...goodWeeks].sort((a, b) => a.volume - b.volume);

  // Trim single outliers at each end when we have enough good weeks
  const trimmed = sorted.length >= 3 ? sorted.slice(1, sorted.length - 1) : sorted;

  const rawMin = trimmed[0].volume;
  const rawMax = trimmed[trimmed.length - 1].volume;

  return {
    min: Math.round(rawMin * (1 - RANGE_WIDEN_FACTOR)),
    max: Math.round(rawMax * (1 + RANGE_WIDEN_FACTOR)),
  };
}

// ─── Step 4: Classify Current Volume Zone ─────────────────────────────────────

/**
 * Classifies whether the current week's volume is below, within, or above the
 * estimated effective range.
 *
 * Returns "unknown" when no range could be estimated.
 * Returns "below" when the current week has zero volume (not yet trained).
 */
export function classifyCurrentVolumeZone(
  currentVolume: number,
  range: { min: number; max: number } | null,
): AdaptiveVolumeZone {
  if (range === null) return "unknown";
  if (currentVolume === 0) return "below";
  if (currentVolume < range.min) return "below";
  if (currentVolume > range.max) return "above";
  return "optimal";
}

// ─── Step 5: Confidence ───────────────────────────────────────────────────────

/**
 * Confidence in the estimated range, based on how many good weeks were observed
 * and whether there's enough context to compare against.
 *
 * - low:    < 2 good weeks (range is null)
 * - medium: exactly 2 good weeks
 * - high:   3+ good weeks with enough total history to compare against
 */
export function computeAdaptiveConfidence(
  goodWeeks: WeeklyMuscleSummary[],
  totalHistoricalWeeks: number,
): AdaptiveVolumeConfidence {
  if (goodWeeks.length < 2) return "low";
  if (goodWeeks.length >= 3 && totalHistoricalWeeks >= 3) return "high";
  return "medium";
}

// ─── Summary String ───────────────────────────────────────────────────────────

/**
 * Returns a short, honest coaching summary for a muscle's volume zone.
 * Never overstates certainty. Language scales with confidence level.
 *
 * @param earlyWeekGuard - true when zone was overridden to "unknown" because
 *   we're early in the week (Mon/Tue) and volume hasn't built up yet.
 */
export function getAdaptiveVolumeSummaryString(
  muscle: string,
  zone: AdaptiveVolumeZone,
  confidence: AdaptiveVolumeConfidence,
  earlyWeekGuard = false,
): string {
  const muscleLower = muscle.toLowerCase();

  if (zone === "unknown") {
    if (earlyWeekGuard) {
      return "Not enough activity this week yet to assess volume.";
    }
    return `Not enough stable data yet to estimate an effective ${muscleLower} volume range.`;
  }

  const hedge =
    confidence === "high"
      ? "likely"
      : confidence === "medium"
        ? "possibly"
        : "tentatively";

  switch (zone) {
    case "optimal":
      return `${muscle} volume is ${hedge} within your best recent range.`;
    case "below":
      return `Current ${muscleLower} volume may be below your best recent range.`;
    case "above":
      return `Current ${muscleLower} volume may be higher than your best recent range.`;
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Adaptive Volume Engine — main entry point.
 *
 * Takes ExerciseProgression[] (from useProgression hook) and returns one
 * MuscleAdaptiveVolumeInsight per muscle group with enough training history.
 *
 * Algorithm:
 * 1. Build weekly muscle summaries from recentSessions across all exercises
 * 2. Identify "good weeks" (positive/stable e1RM, no fatigue signals)
 * 3. Estimate the effective range from good-week volumes
 * 4. Classify the current week against that range
 * 5. Score confidence based on evidence depth
 *
 * Returns only muscles with at least one session in recent history.
 * Returns zone: "unknown" and estimatedRange: null when data is insufficient.
 */
export function getAdaptiveVolumeInsights(
  progressions: ExerciseProgression[],
): MuscleAdaptiveVolumeInsight[] {
  const allSummaries = buildWeeklyMuscleSummaries(progressions);
  const currentWeekKey = getCurrentMondayKey();

  // Get all muscles that appear in the summaries
  const muscles = Array.from(new Set(allSummaries.map((s) => s.muscle)));

  return muscles.map((muscle) => {
    const muscleSummaries = allSummaries.filter((s) => s.muscle === muscle);

    // Separate current week from historical weeks used to build the range
    const historicalSummaries = muscleSummaries.filter(
      (s) => s.weekKey !== currentWeekKey,
    );
    const currentSummary = muscleSummaries.find(
      (s) => s.weekKey === currentWeekKey,
    );
    const currentWeeklyVolume = currentSummary?.volume ?? 0;

    const goodWeeks = historicalSummaries.filter(isGoodWeek);
    const estimatedRange = estimateAdaptiveVolumeRange(historicalSummaries);
    const confidence = computeAdaptiveConfidence(
      goodWeeks,
      historicalSummaries.length,
    );

    const rawZone = classifyCurrentVolumeZone(currentWeeklyVolume, estimatedRange);

    // Early-week guard: Mon/Tue with low/zero volume produces a "below"
    // classification that is technically correct but UX-noisy — suppress it.
    const earlyWeekGuard =
      isEarlyInWeek() && (currentWeeklyVolume === 0 || rawZone === "below");
    const zone: AdaptiveVolumeZone = earlyWeekGuard ? "unknown" : rawZone;

    const summary = getAdaptiveVolumeSummaryString(
      muscle,
      zone,
      confidence,
      earlyWeekGuard,
    );

    return {
      muscle,
      currentWeeklyVolume,
      estimatedRange,
      zone,
      confidence,
      summary,
    };
  });
}

// ─── Re-export muscle mapping for downstream consumers ────────────────────────

export { MUSCLE_TO_MAIN, toMainGroup };
