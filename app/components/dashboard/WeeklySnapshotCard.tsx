"use client";

import type { WorkoutSession } from "@/app/types";

type WeeklySnapshotCardProps = {
  history: WorkoutSession[];
  streak?: number;
  plannedWorkouts?: number;
};

function getStartOfWeekMs(): number {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function getStatusLabel(completed: number, planned: number | undefined): string {
  if (planned == null) return completed >= 2 ? "On track" : "Keep going";
  if (completed >= planned) return "Week complete";
  if (completed >= Math.ceil(planned / 2)) return "On track";
  return "Keep going";
}

export default function WeeklySnapshotCard({
  history,
  streak = 0,
  plannedWorkouts,
}: WeeklySnapshotCardProps) {
  const weekStart = getStartOfWeekMs();
  const count = history.filter((w) => w.startedAt >= weekStart && w.startedAt > 0).length;
  const status = getStatusLabel(count, plannedWorkouts);

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">This Week</p>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-black text-white">{count}</span>
        {plannedWorkouts != null && (
          <span className="text-base font-bold text-zinc-600">/ {plannedWorkouts}</span>
        )}
        <span className="text-xs text-zinc-600 ml-1">workouts</span>
      </div>

      <div className="space-y-0.5">
        {streak > 0 && (
          <p className="text-xs text-zinc-500">
            Streak: <span className="text-red-500 font-semibold">{streak} day{streak !== 1 ? "s" : ""}</span>
          </p>
        )}
        <p className="text-xs text-zinc-600">{status}</p>
      </div>
    </div>
  );
}
