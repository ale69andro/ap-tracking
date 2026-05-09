"use client";

import { useMemo } from "react";
import { ACTION_LABEL } from "@/app/lib/coachLabels";
import { getDashboardCoachSignal } from "@/lib/analysis/getDashboardCoachSignal";
import type { ExercisePrescription, ExerciseProgression } from "@/app/types";

type CoachSnapshotCardProps = {
  progressions: ExerciseProgression[];
  getPrescription: (name: string) => ExercisePrescription | undefined;
  onReview?: () => void;
};

const SIGNAL_TITLE_COLOR = {
  good:    "text-emerald-400",
  warning: "text-amber-400",
  neutral: "text-white",
} as const;

export default function CoachSnapshotCard({
  progressions,
  getPrescription,
  onReview,
}: CoachSnapshotCardProps) {
  const active = progressions
    .map((p) => ({ progression: p, prescription: getPrescription(p.name) }))
    .filter((x) => x.prescription != null);

  const preview = active.slice(0, 2);

  const signal = useMemo(
    () => getDashboardCoachSignal(progressions),
    [progressions],
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Coach Actions</p>
          <p className={`text-sm font-bold truncate ${active.length > 0 ? "text-white" : SIGNAL_TITLE_COLOR[signal.state]}`}>
            {active.length > 0
              ? `${active.length} prescription${active.length !== 1 ? "s" : ""} pending`
              : signal.title}
          </p>
        </div>
        {onReview && active.length > 0 && (
          <button
            onClick={onReview}
            className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors shrink-0"
          >
            Review
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-zinc-600">{signal.subtitle}</p>
      ) : (
        <div className="space-y-2">
          {preview.map(({ progression, prescription }) => (
            <div key={progression.name} className="flex items-center justify-between">
              <p className="text-xs text-zinc-300 font-medium truncate flex-1 pr-2">{progression.name}</p>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 shrink-0">
                {ACTION_LABEL[prescription!.action] ?? prescription!.action}
              </span>
            </div>
          ))}
          {active.length > 2 && (
            <p className="text-[10px] text-zinc-700">+{active.length - 2} more</p>
          )}
        </div>
      )}
    </div>
  );
}
