import type { ExerciseProgression } from "@/app/types";
import { computeNextTarget } from "@/app/lib/recommendations";
import SparkLine from "./SparkLine";

const TREND_CONFIG = {
  up:   { label: "Progressing",    color: "text-emerald-400", spark: "#10b981" },
  flat: { label: "Plateau",        color: "text-zinc-400",    spark: "#71717a" },
  down: { label: "Declining",      color: "text-red-400",     spark: "#f87171" },
  none: { label: "Not enough data",color: "text-zinc-600",    spark: "#52525b" },
};

type Props = {
  progression: ExerciseProgression;
  onClose: () => void;
};

export default function ExerciseDetailSheet({ progression, onClose }: Props) {
  const { name, muscleGroups, bestWeight, recentSessions, trend, analysis } = progression;
  const t = TREND_CONFIG[trend];
  const nextTarget = computeNextTarget(recentSessions, trend);

  const reasonText  = analysis?.reason ?? null;
  const currentE1RM = analysis?.currentE1RM ?? null;
  const confidence  = analysis?.confidence ?? null;
  const nextWeight   = analysis?.suggestedNextWeight ?? nextTarget?.weight ?? null;
  const nextRepRange = analysis?.suggestedRepRange ?? (
    nextTarget
      ? nextTarget.repsMin === nextTarget.repsMax
        ? `${nextTarget.repsMin}`
        : `${nextTarget.repsMin}–${nextTarget.repsMax}`
      : null
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl shadow-2xl pb-8">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-zinc-800">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg font-black text-white">{name}</h2>
            {muscleGroups.length > 0 && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{muscleGroups.join(" · ")}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4 space-y-5">

          {/* Hero stat */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">Best Weight</p>
              <p className="text-3xl font-black text-white tabular-nums leading-none">
                {bestWeight > 0 ? `${bestWeight}` : "—"}
                <span className="text-base font-normal text-zinc-500 ml-1">kg</span>
              </p>
              {currentE1RM !== null && (
                <p className="text-[10px] text-zinc-600 mt-1">
                  e1RM <span className="text-zinc-400 font-semibold">{currentE1RM} kg</span>
                </p>
              )}
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">Trend</p>
              <p className={`text-sm font-bold ${t.color}`}>{t.label}</p>
              {reasonText && (
                <p className="text-[10px] text-zinc-500 mt-0.5 max-w-[140px]">{reasonText}</p>
              )}
              {confidence && (
                <p className="text-[10px] text-zinc-700 mt-0.5">
                  {confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : "Low confidence"}
                </p>
              )}
            </div>
          </div>

          {/* Next Session recommendation */}
          {nextWeight !== null && nextRepRange !== null && trend !== "none" && (
            <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mb-2">
                Next Session
              </p>
              <p className="text-lg font-black text-white tabular-nums leading-none">
                {nextWeight} kg
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  × {nextRepRange} reps
                </span>
              </p>
              <p className="text-[11px] text-zinc-600 mt-1.5">{nextTarget?.note}</p>
            </div>
          )}

          {/* Spark chart with date labels */}
          {recentSessions.length >= 2 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Last {recentSessions.length} Sessions</p>
              <SparkLine
                data={recentSessions.map((s) => s.topWeight)}
                height={64}
                color={t.spark}
              />
              <div className="flex mt-1">
                {recentSessions.map((s, i) => (
                  <p key={i} className="flex-1 text-[9px] text-zinc-700 text-center truncate">{s.date.split(" ").slice(1, 3).join(" ")}</p>
                ))}
              </div>
            </div>
          )}

          {/* Most recent session breakdown */}
          {recentSessions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Last Session</p>
              <div className="bg-zinc-800/50 rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Top Set</span>
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    {recentSessions[recentSessions.length - 1].topWeight} kg × {recentSessions[recentSessions.length - 1].topReps} reps
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Total Volume</span>
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    {recentSessions[recentSessions.length - 1].totalVolume.toFixed(0)} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Date</span>
                  <span className="font-semibold text-zinc-400">
                    {recentSessions[recentSessions.length - 1].date}
                  </span>
                </div>
              </div>
            </div>
          )}

          {recentSessions.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-4">No session data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
