"use client";

import type { WorkoutSession } from "@/app/types";
import { getSessionDate } from "@/app/lib/dateUtils";
import { computeWorkoutHighlight, computeStrengthDelta, getEffectiveSets, type PRRecord } from "@/app/lib/workout";

type Props = {
  session: WorkoutSession;
  onDone: () => void;
  skippedSets?: number;
  previousSessions?: WorkoutSession[];
  prs?: PRRecord[];
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.round(seconds / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

export default function WorkoutSummaryScreen({ session, onDone, skippedSets = 0, previousSessions, prs = [] }: Props) {
  const totalSets = session.exercises.reduce((n, e) => n + getEffectiveSets(e.sets).length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, e) =>
      sum +
      getEffectiveSets(e.sets).reduce((s, set) => {
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps)   || 0;
        return s + w * r;
      }, 0),
    0
  );

  const highlight = computeWorkoutHighlight(session);
  const strengthDelta = previousSessions ? computeStrengthDelta(session, previousSessions) : null;
  const hasFeedback = strengthDelta !== null || prs.length > 0;

  const summaryTitle =
    strengthDelta === null ? session.name
    : strengthDelta > 0   ? "Stronger"
    : strengthDelta === 0 ? "Solid"
    :                       "Recovery";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col px-4 pt-16 pb-12 max-w-xl mx-auto">
      <div className="mb-10">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          Workout Complete
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight leading-none">
          {summaryTitle}
        </h1>
        <p className="text-sm text-zinc-500 mt-2">{getSessionDate(session)}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Duration"    value={formatDuration(session.durationSeconds)} />
        <StatCard label="Exercises"   value={String(session.exercises.filter(e => e.sets.length > 0).length)} />
        <StatCard label="Total Sets"  value={String(totalSets)} />
        <StatCard
          label="Total Volume"
          value={totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : "—"}
        />
      </div>

      {/* Feedback block */}
      {hasFeedback && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-5 mb-4">
          {strengthDelta !== null && (
            <p className={`text-xl font-black tabular-nums ${prs.length > 0 ? "mb-3" : ""} ${strengthDelta > 0 ? "text-emerald-400" : strengthDelta === 0 ? "text-zinc-300" : "text-orange-400"}`}>
              {strengthDelta === 0
                ? "Same strength as last session"
                : `${strengthDelta > 0 ? "+" : ""}${strengthDelta}% ${strengthDelta > 0 ? "stronger" : "weaker"} than last session`}
            </p>
          )}
          {prs.length > 0 && (
            <div>
              <p className="text-sm font-bold text-white mb-1.5">
                🏆 {prs.length} {prs.length === 1 ? "PR" : "PRs"} today
              </p>
              {prs.map((pr) => (
                <p key={pr.exerciseName} className="text-xs text-zinc-400 leading-relaxed">
                  {pr.exerciseName} — New {pr.type === "e1rm" ? "e1RM" : "Weight"} PR
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coach insight */}
      {(strengthDelta !== null || prs.length > 0) && (
        <p className="text-xs text-zinc-500 mb-4 -mt-1">
          {strengthDelta !== null
            ? strengthDelta >= 3
              ? "Your strength is trending up."
              : strengthDelta >= -1
              ? "You matched your previous performance."
              : "Recovery session — strength was lower today."
            : "You hit a new PR today."}
        </p>
      )}

      {/* Skipped sets notice */}
      {skippedSets > 0 && (
        <p className="text-xs text-zinc-500 mb-6 -mt-2">
          {skippedSets} incomplete {skippedSets === 1 ? "set was" : "sets were"} skipped
        </p>
      )}

      {/* Workout highlight */}
      {highlight ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-5 mb-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mb-2">
            Workout Highlight
          </p>
          <p className="text-lg font-black text-white leading-tight">
            {highlight.exerciseName}
          </p>
          <p className="text-sm text-zinc-300 mt-1 tabular-nums">
            {highlight.weight} kg × {highlight.reps} reps
          </p>
          <p className="text-xs text-zinc-600 mt-1.5">
            Est. 1RM:{" "}
            <span className="text-zinc-400 font-semibold tabular-nums">
              {highlight.estimated1RM} kg
            </span>
          </p>
        </div>
      ) : (
        <div className="mb-10" />
      )}

      <button
        onClick={onDone}
        className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase transition-all shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:shadow-[0_0_36px_rgba(239,68,68,0.5)]"
      >
        Done
      </button>
    </main>
  );
}
