import type { ExerciseSet } from "@/app/types";
import { calculate1RM } from "@/lib/analysis/calculate1RM";

/** 2.5% — accounts for plate-rounding and minor session variance */
const TREND_THRESHOLD = 0.03;

/**
 * Peak session performance score: max estimated 1RM across all valid sets.
 * Max (not average) because warm-up and backoff sets would dilute the peak signal.
 * The heaviest set isn't always the best — a lighter-but-higher-rep set can score higher.
 */
export function computeSessionScore(sets: ExerciseSet[]): number {
  let best = 0;
  for (const s of sets) {
    const w = parseFloat(s.weight) || 0;
    const r = parseFloat(s.reps) || 0;
    if (w > 0 && r > 0) {
      best = Math.max(best, calculate1RM(w, r));
    }
  }
  return best;
}

/**
 * Classifies trend from a list of session scores (oldest → newest).
 *
 * Uses half-average comparison: splits the window into an earlier half
 * and a recent half, then compares their means. This smooths over a
 * single outlier session that would otherwise flip first-vs-last.
 *
 *   delta = (recentMean - earlierMean) / earlierMean
 *   > +THRESHOLD → "up"
 *   < -THRESHOLD → "down"
 *   otherwise    → "flat"
 *
 * Falls back to a direct two-point comparison when only 2 scores exist.
 */
export function computeTrend(scores: number[]): "up" | "flat" | "down" | "none" {
  // Require at least 3 sessions for a meaningful classification
  if (scores.length < 3) return "none";

  const mid = Math.floor(scores.length / 2);
  const earlier = scores.slice(0, mid);
  const recent = scores.slice(mid);
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const earlierMean = mean(earlier);
  const delta = earlierMean > 0 ? (mean(recent) - earlierMean) / earlierMean : 0;

  if (delta > TREND_THRESHOLD) return "up";
  if (delta < -TREND_THRESHOLD) return "down";
  return "flat";
}
