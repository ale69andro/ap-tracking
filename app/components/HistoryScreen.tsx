"use client";

import { useMemo, useState } from "react";
import type { WorkoutHighlight, WorkoutSession } from "@/app/types";
import { computeVolume, computeWorkoutHighlight, formatDuration } from "@/app/lib/workout";
import WorkoutDetailSheet from "./WorkoutDetailSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutWithStats = WorkoutSession & {
  volume: number;
  highlight: WorkoutHighlight | null;
};

type MonthGroup = {
  label: string;
  workouts: WorkoutWithStats[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(w: WorkoutSession): string {
  if (w.startedAt > 0) {
    const d = new Date(w.startedAt);
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${date} · ${time}`;
  }
  return w.date ?? "—";
}

function formatVolumeCompact(kg: number): string {
  if (kg <= 0) return "—";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

function StatLine({ w }: { w: WorkoutWithStats }) {
  const parts: string[] = [];
  const dur = formatDuration(w.durationSeconds);
  if (dur !== "—") parts.push(dur);
  const vol = formatVolumeCompact(w.volume);
  if (vol !== "—") parts.push(vol);

  if (parts.length === 0) return <span className="text-zinc-600">—</span>;

  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-zinc-700 mx-2">•</span>}
          {p}
        </span>
      ))}
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function WorkoutCard({
  workout: w,
  onTap,
}: {
  workout: WorkoutWithStats;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900/30 border border-zinc-800/25 rounded-[18px] px-5 py-4 hover:bg-zinc-800/40 hover:border-zinc-700/30 active:scale-[0.98] transition-all duration-150"
    >
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <p className="font-black text-white text-[17px] leading-snug truncate">
          {w.name}
        </p>
        <p className="text-[11px] text-zinc-600 shrink-0 tabular-nums">
          {formatShortDate(w)}
        </p>
      </div>
      <p className="text-sm text-zinc-500 font-medium tabular-nums">
        <StatLine w={w} />
      </p>
      {w.highlight && (
        <p className="text-xs text-zinc-600 mt-1.5 tabular-nums">
          <span className="text-zinc-500">{w.highlight.exerciseName}</span>
          {" · "}
          {w.highlight.weight} kg × {w.highlight.reps}
          {" · "}
          <span className="text-zinc-600">est. 1RM {w.highlight.estimated1RM} kg</span>
        </p>
      )}
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  history: WorkoutSession[];
  onStartWorkout?: () => void;
};

export default function HistoryScreen({ history, onStartWorkout }: Props) {
  const [selected, setSelected] = useState<WorkoutSession | null>(null);

  const groups = useMemo<MonthGroup[]>(() => {
    const withStats: WorkoutWithStats[] = history.map((w) => ({
      ...w,
      volume: computeVolume(w),
      highlight: computeWorkoutHighlight(w),
    }));

    const map = new Map<string, WorkoutWithStats[]>();
    for (const w of withStats) {
      const label =
        w.startedAt > 0
          ? new Date(w.startedAt).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })
          : "Earlier";
      const bucket = map.get(label);
      if (bucket) bucket.push(w);
      else map.set(label, [w]);
    }

    return Array.from(map.entries()).map(([label, workouts]) => ({ label, workouts }));
  }, [history]);

  return (
    <>
      {selected && (
        <WorkoutDetailSheet workout={selected} onClose={() => setSelected(null)} />
      )}

      {/* Header */}
      <header className="mb-8">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          AP-Tracking
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            History
          </h1>
          {history.length > 0 && (
            <p className="text-sm text-zinc-600 pb-1">
              {history.length} workout{history.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </header>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
          <div>
            <p className="text-zinc-400 text-base font-bold mb-1">No workouts yet</p>
            <p className="text-zinc-600 text-sm">Complete a session to see it here.</p>
          </div>
          {onStartWorkout && (
            <button
              onClick={onStartWorkout}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-sm tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              Start Workout
            </button>
          )}
        </div>
      )}

      {/* Month groups */}
      <div className="space-y-10">
        {groups.map((group, gi) => (
          <section key={group.label}>
            <div className={`flex items-center gap-3 mb-4 ${gi > 0 ? "pt-2" : ""}`}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">
                {group.label}
              </p>
              <div className="flex-1 h-px bg-zinc-800/60" />
            </div>
            <div className="space-y-4">
              {group.workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} onTap={() => setSelected(w)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
