"use client";

import type { WeeklyVolumeResult } from "@/lib/analysis/getWeeklyVolumeByMuscleGroup";

// ─── Config ───────────────────────────────────────────────────────────────────

const GROUP_COLOR: Record<string, string> = {
  Chest:     "#ef4444",
  Back:      "#3b82f6",
  Legs:      "#10b981",
  Shoulders: "#f59e0b",
  Arms:      "#8b5cf6",
};

// ─── Delta label ──────────────────────────────────────────────────────────────

function DeltaBadge({ pct, hasPrev }: { pct: number; hasPrev: boolean }) {
  if (!hasPrev || Math.abs(pct) < 5) return null;
  const positive = pct > 0;
  return (
    <span
      className={`text-[10px] font-bold tabular-nums ${
        positive ? "text-emerald-500" : "text-red-400"
      }`}
    >
      {positive ? "+" : ""}
      {Math.round(pct)}%
    </span>
  );
}

// ─── Single muscle group row ──────────────────────────────────────────────────

function MuscleRow({
  group,
  current,
  previous,
  deltaPercent,
  maxVolume,
  hasPrevData,
}: {
  group: string;
  current: number;
  previous: number;
  deltaPercent: number;
  maxVolume: number;
  hasPrevData: boolean;
}) {
  const color = GROUP_COLOR[group] ?? "#71717a";
  const safeMax = Math.max(maxVolume, 1);
  const currWidth = current > 0 ? Math.max((current / safeMax) * 100, 3) : 0;
  const prevWidth = previous > 0 ? Math.max((previous / safeMax) * 100, 3) : 0;
  const isEmpty = current === 0 && previous === 0;

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`text-[12px] font-bold ${isEmpty ? "text-zinc-700" : "text-zinc-300"}`}
        >
          {group}
        </span>
        <DeltaBadge pct={deltaPercent} hasPrev={hasPrevData && previous > 0} />
        {isEmpty && (
          <span className="text-[10px] text-zinc-800">—</span>
        )}
      </div>

      {/* Bar track */}
      <div className="relative h-[5px] bg-zinc-800/50 rounded-full overflow-hidden">
        {/* Previous week ghost */}
        {hasPrevData && prevWidth > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${prevWidth}%`, backgroundColor: color, opacity: 0.18 }}
          />
        )}
        {/* Current week bar */}
        {currWidth > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${currWidth}%`, backgroundColor: color }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function VolumeOverviewCard({ data }: { data: WeeklyVolumeResult }) {
  const maxVolume = Math.max(...data.groups.map((g) => Math.max(g.current, g.previous)), 1);
  const hasPrevData = data.groups.some((g) => g.previous > 0);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl px-4 pt-4 pb-3 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Volume · This Week
        </p>
        {hasPrevData && (
          <p className="text-[9px] text-zinc-700 font-medium">vs last week</p>
        )}
      </div>

      {/* Muscle group rows */}
      <div className="space-y-3">
        {data.groups.map((g) => (
          <MuscleRow
            key={g.group}
            {...g}
            maxVolume={maxVolume}
            hasPrevData={hasPrevData}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800/40 mt-4 mb-3" />

      {/* Coach insight */}
      <p className="text-[11px] text-zinc-500 leading-snug">{data.insight}</p>
    </div>
  );
}
