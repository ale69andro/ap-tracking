"use client";

import type {
  MuscleAdaptiveVolumeRecommendation,
  AdaptiveVolumeActionType,
  AdaptiveVolumeConfidence,
} from "@/app/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const MUSCLE_ORDER = ["Chest", "Back", "Legs", "Shoulders", "Arms"] as const;
type MainMuscle = (typeof MUSCLE_ORDER)[number];

const BADGE: Record<AdaptiveVolumeActionType, { label: string; cls: string }> = {
  add_sets:          { label: "Low",      cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  reduce_sets:       { label: "High",     cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  hold:              { label: "On track", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  collect_more_data: { label: "—",        cls: "text-zinc-600 bg-zinc-800/20 border-zinc-700/20" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowCopy(
  action: AdaptiveVolumeActionType,
  confidence: AdaptiveVolumeConfidence,
): string | null {
  if (action === "collect_more_data") return null;
  if (action === "hold") return "Keep volume steady";
  if (action === "add_sets") {
    return confidence === "high"
      ? "Add volume — likely underdosed"
      : "Volume may be slightly low";
  }
  // reduce_sets
  return confidence === "high"
    ? "Reduce volume — recovery risk"
    : "Slightly above range — pull back";
}

function formatAdj(adj: number | null, action: AdaptiveVolumeActionType): string | null {
  if (adj === null) return null;
  const abs    = Math.abs(adj);
  const prefix = action === "add_sets" ? "+" : "−";
  if (abs === 3) return `${prefix}2–4 sets`;
  if (abs === 2) return `${prefix}2 sets`;
  return `${prefix}${abs} sets`;
}

function actionPriority(action: AdaptiveVolumeActionType): number {
  if (action === "add_sets")    return 0; // BELOW — needs more volume
  if (action === "reduce_sets") return 1; // ABOVE — needs correction
  if (action === "hold")        return 2; // OPTIMAL — all good
  return 3;                               // UNKNOWN — no data
}

/**
 * Fills in any missing muscle groups (engine only returns trained muscles)
 * and sorts by importance: BELOW → ABOVE → OPTIMAL → UNKNOWN.
 * Within each priority group, stable MUSCLE_ORDER is preserved.
 */
function fillAndSort(
  recs: MuscleAdaptiveVolumeRecommendation[],
): MuscleAdaptiveVolumeRecommendation[] {
  const byMuscle = new Map(recs.map((r) => [r.muscle, r]));
  const filled: MuscleAdaptiveVolumeRecommendation[] = MUSCLE_ORDER.map((muscle) =>
    byMuscle.get(muscle) ?? {
      muscle,
      action: "collect_more_data" as AdaptiveVolumeActionType,
      setAdjustment: null,
      confidence: "low" as AdaptiveVolumeConfidence,
      reason: "No training data",
      recommendation: "Not enough data yet",
    },
  );
  return filled.sort((a, b) => {
    const pd = actionPriority(a.action) - actionPriority(b.action);
    if (pd !== 0) return pd;
    return (
      MUSCLE_ORDER.indexOf(a.muscle as MainMuscle) -
      MUSCLE_ORDER.indexOf(b.muscle as MainMuscle)
    );
  });
}

/**
 * Derives a one-line summary from the most critical pattern across muscles.
 * Skips if no actionable signals exist.
 */
function deriveSummary(recs: MuscleAdaptiveVolumeRecommendation[]): string | null {
  const below = recs.filter((r) => r.action === "add_sets").map((r) => r.muscle);
  const above = recs.filter((r) => r.action === "reduce_sets").map((r) => r.muscle);

  if (below.length >= 2) {
    const names = below.slice(0, 2).map((m) => m.toLowerCase()).join(" and ");
    return `Consider increasing ${names} volume this week`;
  }
  if (above.length >= 2) {
    const names = above.slice(0, 2).map((m) => m.toLowerCase()).join(" and ");
    return `Consider easing ${names} volume this week`;
  }
  if (below.length === 1) {
    return `${below[0]} volume looks low — consider adding more this week`;
  }
  if (above.length === 1) {
    return `${above[0]} volume may be above your best range`;
  }
  return null;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MuscleRow({ rec }: { rec: MuscleAdaptiveVolumeRecommendation }) {
  const badge     = BADGE[rec.action];
  const adj       = formatAdj(rec.setAdjustment, rec.action);
  const copy      = getRowCopy(rec.action, rec.confidence);
  const isUnknown = rec.action === "collect_more_data";

  return (
    <div>
      <div className="flex items-center gap-2.5">
        {/* Muscle name */}
        <span
          className={`text-[13px] font-bold w-20 shrink-0 ${
            isUnknown ? "text-zinc-700" : "text-zinc-200"
          }`}
        >
          {rec.muscle}
        </span>

        {/* Zone badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}
        >
          {badge.label}
        </span>

        {/* Set adjustment hint */}
        {adj && (
          <span
            className={`ml-auto text-[11px] font-black tabular-nums ${
              rec.action === "add_sets" ? "text-blue-400" : "text-amber-400"
            }`}
          >
            {adj}
          </span>
        )}
      </div>

      {/* Recommendation copy — omitted for unknown muscles */}
      {copy && (
        <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{copy}</p>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function WeeklyCoachingCard({
  recommendations,
}: {
  recommendations: MuscleAdaptiveVolumeRecommendation[];
}) {
  const sorted     = fillAndSort(recommendations);
  const allUnknown = sorted.every((r) => r.action === "collect_more_data");
  const summary    = allUnknown ? null : deriveSummary(sorted);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl px-4 pt-4 pb-3 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Weekly Coaching
        </p>
        <p className="text-[9px] text-zinc-700 font-medium">Based on recent training</p>
      </div>

      {/* Optional summary line */}
      {summary && (
        <p className="text-[12px] text-zinc-400 font-medium mb-3 leading-snug">{summary}</p>
      )}

      {/* All-unknown empty state */}
      {allUnknown ? (
        <p className="text-[12px] text-zinc-500 leading-snug mt-2">
          Not enough data yet — train consistently to unlock coaching insights.
        </p>
      ) : (
        <div className="space-y-3 mt-3">
          {sorted.map((rec) => (
            <MuscleRow key={rec.muscle} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
