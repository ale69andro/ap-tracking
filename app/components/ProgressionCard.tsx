import { useState } from "react";
import type { ExerciseProgression, ExerciseSession, ExerciseTrend, ExerciseRecommendationAction, ExercisePrescription } from "@/app/types";
import { calculateEpley1RM } from "@/lib/analysis/exerciseMetrics";
import { getExerciseRecommendation } from "@/lib/analysis/getExerciseRecommendation";
import type { AcceptPrescriptionParams } from "@/app/hooks/usePrescriptions";
import SparkLine from "./SparkLine";

const ACTION_LABEL: Partial<Record<ExerciseRecommendationAction, string>> = {
  increase_load: "Add weight",
  increase_reps: "Build reps",
  hold:          "Hold load",
  reduce_load:   "Reduce load",
  deload:        "Deload",
};

const TREND_CONFIG: Record<ExerciseTrend, { label: string; color: string; bg: string; arrow: string; spark: string }> = {
  up:    { label: "Progressing",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", arrow: "↑", spark: "#10b981" },
  mixed: { label: "Mixed",           color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20",   arrow: "↕", spark: "#f59e0b" },
  flat:  { label: "Plateau",         color: "text-zinc-400",    bg: "bg-zinc-700/30 border-zinc-700/30",       arrow: "→", spark: "#71717a" },
  down:  { label: "Declining",       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         arrow: "↓", spark: "#f87171" },
  none:  { label: "Not enough data", color: "text-zinc-600",    bg: "bg-zinc-800/50 border-zinc-700/40",       arrow: "·", spark: "#52525b" },
};

// ─── Delta helper ────────────────────────────────────────────────────────────

type Delta = { text: string; positive: boolean; neutral: boolean };

function buildDelta(sessions: ExerciseSession[]): Delta | null {
  if (sessions.length < 2) return null;
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];

  const wDiff = +(last.topWeight - prev.topWeight).toFixed(2);
  const rDiff = last.topReps - prev.topReps;

  const parts: string[] = [];
  if (wDiff !== 0) parts.push(`${wDiff > 0 ? "+" : ""}${wDiff} kg`);
  if (rDiff !== 0) parts.push(`${rDiff > 0 ? "+" : ""}${rDiff} rep${Math.abs(rDiff) !== 1 ? "s" : ""}`);

  if (parts.length === 0) return { text: "Same as last time", positive: true, neutral: true };
  return {
    text: parts.join("  ·  "),
    positive: wDiff > 0 || (wDiff === 0 && rDiff > 0),
    neutral: false,
  };
}

// ─── Card ────────────────────────────────────────────────────────────────────

type Props = {
  progression: ExerciseProgression;
  onTap: () => void;
  /** Active (unconsumed) prescription for this exercise, if one exists. */
  activePrescription?: ExercisePrescription;
  /** Called when user taps "Apply next time". Undefined = feature not available. */
  onAcceptPrescription?: (params: AcceptPrescriptionParams) => Promise<void>;
};

function resolvedTrendKey(p: ExerciseProgression): ExerciseTrend {
  const t = p.analysis?.trend;
  if (t === "progressing") return "up";
  if (t === "mixed")       return "mixed";
  if (t === "stagnating")  return "flat";
  if (t === "regressing")  return "down";
  // fallback: multi-session interpretation
  const ms = p.analysis?.interpretation?.mappedStatus;
  if (ms === "progressing") return "up";
  if (ms === "stagnating")  return "flat";
  if (ms === "regressing")  return "down";
  return p.trend;
}

export default function ProgressionCard({ progression, onTap, activePrescription, onAcceptPrescription }: Props) {
  const { name, muscleGroups, bestWeight, recentSessions } = progression;
  const t     = TREND_CONFIG[resolvedTrendKey(progression)];
  const delta = buildDelta(recentSessions);
  const [isAccepting, setIsAccepting] = useState(false);

  // Central recommendation engine — no repRange here (trend-based fallback).
  // recentSessions are already filtered to working sets by useProgression.
  const recommendation = getExerciseRecommendation({ exerciseName: name, sessions: recentSessions, repRange: progression.repRange });

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 pr-3">
          <p className="text-sm font-bold text-white truncate">{name}</p>
          {muscleGroups.length > 0 && (
            <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{muscleGroups.join(" · ")}</p>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${t.bg} ${t.color}`}>
          {t.arrow} {t.label}
        </span>
      </div>

      {/* Interpretation headline */}
      {progression.analysis?.interpretation && (
        <p className={`text-[15px] font-black leading-snug mb-0.5 ${t.color}`}>
          {progression.analysis.interpretation.title}
        </p>
      )}
      {progression.analysis?.interpretation?.subtitle && (
        <p className="text-[11px] text-zinc-500 mb-1 leading-snug">
          {progression.analysis.interpretation.subtitle}
        </p>
      )}

      {/* Delta vs last session */}
      {delta ? (
        <p className={`text-xs tabular-nums mb-3 ${
          delta.neutral ? "text-zinc-600" : delta.positive ? "text-emerald-600" : "text-red-600"
        }`}>
          {delta.text} vs last session
        </p>
      ) : (
        <p className="text-xs text-zinc-600 mb-3">First session</p>
      )}

      {/* Sparkline — e1RM series, dashboard variant for wide+short aspect ratio */}
      {recentSessions.length >= 2 && (
        <div className="mb-3">
          <SparkLine
            data={recentSessions.map((s) => calculateEpley1RM(s.topWeight, s.topReps))}
            height={48}
            color={t.spark}
            variant="dashboard"
          />
        </div>
      )}

      {/* Best weight */}
      <p className="text-[11px] text-zinc-600 font-medium tabular-nums">
        Best — <span className="text-zinc-400 font-bold">{bestWeight > 0 ? `${bestWeight} kg` : "—"}</span>
      </p>

      {/* Next session target — from recommendation engine */}
      {recommendation.action !== "new" && recommendation.confidence !== "low" && recommendation.targetWeight !== null && (
        <div className="mt-2 pt-2 border-t border-zinc-800/60">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">
              {ACTION_LABEL[recommendation.action] ?? "Next"}
            </p>
            <p className="text-[12px] font-bold tabular-nums text-zinc-200">
              {recommendation.targetWeight} kg × {
                recommendation.targetRepsMin === recommendation.targetRepsMax
                  ? recommendation.targetRepsMin
                  : `${recommendation.targetRepsMin}–${recommendation.targetRepsMax}`
              }
            </p>
          </div>
          {recommendation.setAction === "reduce_set" && recommendation.targetSets !== undefined && (
            <p className="text-[10px] text-zinc-500 mt-0.5">Drop to {recommendation.targetSets} sets</p>
          )}
          <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{recommendation.reason}</p>

          {/* Apply next time — only shown when the feature is wired in */}
          {onAcceptPrescription && (
            <div className="mt-2">
              {activePrescription ? (
                <span className="text-[10px] font-semibold text-emerald-500">
                  Applied for next session
                </span>
              ) : (
                <button
                  disabled={isAccepting}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsAccepting(true);
                    try {
                      await onAcceptPrescription({
                        exercise_name:   name,
                        target_weight:   recommendation.targetWeight,
                        target_reps_min: recommendation.targetRepsMin,
                        target_reps_max: recommendation.targetRepsMax,
                        target_sets:     recommendation.targetSets ?? null,
                        action:          recommendation.action,
                        confidence:      recommendation.confidence,
                        reason:          recommendation.reason,
                      });
                    } finally {
                      setIsAccepting(false);
                    }
                  }}
                  className="text-[10px] font-semibold text-red-400 active:text-red-300 transition-colors disabled:opacity-50"
                >
                  Apply next time
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
