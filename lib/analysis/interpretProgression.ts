import type { ProgressionInterpretation, ProgressionStatus } from "@/app/types";

// ── mappedStatus helper ───────────────────────────────────────────────────────

function toMappedStatus(status: ProgressionStatus): ProgressionInterpretation["mappedStatus"] {
  if (status === "progressing" || status === "improving_slightly") return "progressing";
  if (status === "regressing") return "regressing";
  return "stagnating"; // stable | stalling | fatigue_dip
}

// ── Thresholds (as fractions of e1RM) ────────────────────────────────────────
// Tuned against the demo dataset (9 exercises, 3–12 sessions each).

const NOISE  = 0.008;  // < 0.8% delta  → noise, not meaningful
const SLIGHT = 0.020;  // 2%            → small but real movement
const CLEAR  = 0.025;  // > 2.5%        → clearly meaningful change

/**
 * Interprets a chronological e1RM series (oldest → newest) and returns
 * a structured coaching verdict with status, confidence, and copy.
 *
 * Status priority (evaluated in order):
 *  1. fatigue_dip   — latest session dropped but prior trend was positive
 *  2. regressing    — both latest delta AND short trend are clearly negative
 *  3. progressing   — sustained upward trend, latest not dropping
 *  4. improving_slightly — small positive trend
 *  5. stalling      — flat trend + low volatility (stuck, not fluctuating)
 *  6. stable        — default: within noise, no clear directional signal
 */
export function interpretProgression(
  e1rmSeries: number[],  // chronological, oldest → newest
): ProgressionInterpretation {
  const n = e1rmSeries.length;

  if (n < 2) {
    return {
      status:       "stable",
      mappedStatus: toMappedStatus("stable"),
      confidence:   "low",
      title:          "First session recorded",
      subtitle:       "Log one more session to start tracking progress",
      recommendation: "Keep logging — more data unlocks accurate analysis",
    };
  }

  // ── Consecutive session deltas ────────────────────────────────────────────
  const deltas: number[] = [];
  for (let i = 1; i < n; i++) {
    if (e1rmSeries[i - 1] > 0) {
      deltas.push((e1rmSeries[i] - e1rmSeries[i - 1]) / e1rmSeries[i - 1]);
    }
  }

  const latestDelta = deltas[deltas.length - 1];
  const shortTrend  = deltas.reduce((s, d) => s + d, 0) / deltas.length;

  // Volatility: coefficient of variation over the e1RM window.
  // High volatility signals fluctuating performance (not stuck at one level).
  const mean       = e1rmSeries.reduce((s, v) => s + v, 0) / n;
  const variance   = e1rmSeries.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const confidence: ProgressionInterpretation["confidence"] =
    n >= 4 ? "high" : n === 3 ? "medium" : "low";

  // ── Status classification ─────────────────────────────────────────────────

  let status: ProgressionStatus;

  if (latestDelta < -NOISE && shortTrend > SLIGHT) {
    // Latest session dipped, but the broader trend was still positive →
    // likely fatigue or a one-off bad day, not a real reversal.
    status = "fatigue_dip";
  } else if (latestDelta < -NOISE && shortTrend < -NOISE) {
    // Both the most recent session AND the short trend are clearly negative →
    // real, sustained regression rather than a single bad day.
    status = "regressing";
  } else if (shortTrend >= CLEAR && latestDelta > -NOISE) {
    // Sustained, clearly positive trend without a recent drop.
    status = "progressing";
  } else if (shortTrend >= NOISE && latestDelta > -SLIGHT) {
    // Moving forward, just not dramatically.
    status = "improving_slightly";
  } else if (shortTrend < NOISE && shortTrend > -CLEAR && volatility < 0.035) {
    // Flat trend + low volatility = genuinely stuck, not fluctuating.
    // High-volatility cases fall through to "stable" (bouncing around ≠ stalling).
    status = "stalling";
  } else {
    status = "stable";
  }

  return buildOutput(status, confidence);
}

// ── Copy generation ───────────────────────────────────────────────────────────

function buildOutput(
  status: ProgressionStatus,
  confidence: ProgressionInterpretation["confidence"],
): ProgressionInterpretation {
  const low = confidence === "low";

  switch (status) {
    case "progressing":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          low ? "Looking good so far"       : "Strength trending up",
        subtitle:       low ? "Early signs of progress"   : "Consistent gains over recent sessions",
        recommendation: "Stay the course — add weight when reps feel comfortable",
      };

    case "improving_slightly":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          "Slowly improving",
        subtitle:       "Small but real gains — building momentum",
        recommendation: "Patience pays — stay consistent and keep increments small",
      };

    case "stable":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          "Strength holding steady",
        subtitle:       "Performance consistent with recent sessions",
        recommendation: "Solid base — push for an extra rep or small weight jump when ready",
      };

    case "stalling":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          "No meaningful progress",
        subtitle:       "Performance unchanged across recent sessions",
        recommendation: low
          ? "Push for one more rep next session"
          : "Shift your rep target or run a short deload — repeating the same session won't break this",
      };

    case "fatigue_dip":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          "Temporary dip",
        subtitle:       "Recent drop after prior gains — likely normal fatigue",
        recommendation: "Hold current load and focus on quality reps — output will recover",
      };

    case "regressing":
      return {
        status,
        mappedStatus: toMappedStatus(status),
        confidence,
        title:          low ? "Output dropping"        : "Performance declining",
        subtitle:       low ? "Below prior level"      : "Sustained drop across recent sessions",
        recommendation: low
          ? "Reduce load slightly and focus on execution"
          : "Cut the load back and rebuild with clean reps — don't add weight until sessions feel controlled again",
      };
  }
}
