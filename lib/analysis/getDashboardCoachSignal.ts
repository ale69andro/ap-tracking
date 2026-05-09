/**
 * Aggregates existing training signals into a single dashboard-level coaching verdict.
 *
 * Priority (highest → lowest):
 *  1. Regressing exercise        — strength consistently dropping
 *  2. Fatigue dip                — recent drop vs prior positive trend
 *  3. Multiple exercises stalling
 *  4. Single exercise stalling (high confidence only)
 *  5. Volume above optimal range
 *  6. Volume below optimal range (high confidence only)
 *  7. Strong positive momentum   — 2+ exercises progressing with high confidence
 *  8. Single exercise trending up (high confidence only)
 *  9. Stable fallback            — nothing worth surfacing
 *
 * Never invents signals. Returns the stable fallback when confidence is low
 * or no meaningful pattern exists.
 */

import { getAdaptiveVolumeInsights } from "./adaptiveVolume";
import type { ExerciseProgression, ProgressionInterpretation } from "@/app/types";

export type CoachSignalState = "good" | "neutral" | "warning";

export type DashboardCoachSignal = {
  title: string;
  subtitle: string;
  state: CoachSignalState;
};

const FALLBACK: DashboardCoachSignal = {
  title: "Training stable",
  subtitle: "No issues detected",
  state: "neutral",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Candidate = { name: string; interp: ProgressionInterpretation };

export function getDashboardCoachSignal(
  progressions: ExerciseProgression[],
): DashboardCoachSignal {
  if (progressions.length === 0) return FALLBACK;

  // Only use exercises with a precomputed interpretation at medium+ confidence.
  // Low confidence = not enough session history to draw conclusions.
  const candidates: Candidate[] = progressions
    .filter(
      (p) =>
        p.analysis?.interpretation != null &&
        p.analysis.interpretation.confidence !== "low",
    )
    .map((p) => ({ name: p.name, interp: p.analysis!.interpretation! }));

  if (candidates.length === 0) return FALLBACK;

  // ── Priority 1: Regressing ──────────────────────────────────────────────────
  const regressing = candidates.find((x) => x.interp.status === "regressing");
  if (regressing) {
    return {
      title: `${regressing.name} — strength dropping`,
      subtitle: "Consistent decline across recent sessions",
      state: "warning",
    };
  }

  // ── Priority 2: Fatigue dip ─────────────────────────────────────────────────
  const fatigueDip = candidates.find((x) => x.interp.status === "fatigue_dip");
  if (fatigueDip) {
    return {
      title: `${fatigueDip.name} — fatigue dip`,
      subtitle: "Recent drop vs prior trend — monitor next session",
      state: "warning",
    };
  }

  // ── Priority 3 & 4: Stalling ────────────────────────────────────────────────
  const stalling = candidates.filter((x) => x.interp.status === "stalling");
  if (stalling.length >= 2) {
    return {
      title: `${stalling.length} exercises stalling`,
      subtitle: "No progression detected across multiple lifts",
      state: "warning",
    };
  }
  if (stalling.length === 1 && stalling[0].interp.confidence === "high") {
    return {
      title: `${stalling[0].name} — stalling`,
      subtitle: "No clear progression in recent sessions",
      state: "warning",
    };
  }

  // ── Priority 5 & 6: Volume signals ─────────────────────────────────────────
  try {
    const volumeInsights = getAdaptiveVolumeInsights(progressions);

    const aboveRange = volumeInsights.filter(
      (i) => i.zone === "above" && i.confidence !== "low",
    );
    if (aboveRange.length > 0) {
      return {
        title: `${capitalize(aboveRange[0].muscle)} volume elevated`,
        subtitle: "Weekly sets above estimated optimal range",
        state: "warning",
      };
    }

    // Require high confidence for "below" to avoid early-week false positives.
    const belowRange = volumeInsights.filter(
      (i) => i.zone === "below" && i.confidence === "high",
    );
    if (belowRange.length > 0) {
      return {
        title: `${capitalize(belowRange[0].muscle)} volume low`,
        subtitle: "Weekly sets below optimal range",
        state: "neutral",
      };
    }
  } catch {
    // Volume analysis is best-effort — don't break the dashboard
  }

  // ── Priority 7 & 8: Positive momentum ──────────────────────────────────────
  const progressing = candidates.filter(
    (x) =>
      x.interp.status === "progressing" && x.interp.confidence === "high",
  );
  if (progressing.length >= 2) {
    return {
      title: "Strong training momentum",
      subtitle: `${progressing.length} exercises trending up`,
      state: "good",
    };
  }
  if (progressing.length === 1) {
    return {
      title: `${progressing[0].name} — trending up`,
      subtitle: "Consistent strength gains detected",
      state: "good",
    };
  }

  return FALLBACK;
}
