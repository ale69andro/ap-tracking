"use client";

import type { ExerciseProgression, ExerciseSession } from "@/app/types";
import { computeNextTarget } from "@/app/lib/recommendations";
import SparkLine from "./SparkLine";

// ─── Config ───────────────────────────────────────────────────────────────────

const TREND = {
  up:   { label: "Progressing", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", spark: "#10b981" },
  flat: { label: "Plateau",     color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20",    spark: "#f59e0b" },
  down: { label: "Declining",   color: "text-red-400",     bg: "bg-red-500/10    border-red-500/20",      spark: "#f87171" },
  none: { label: "New",         color: "text-zinc-500",    bg: "bg-zinc-800/50   border-zinc-700/30",     spark: "#52525b" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Delta = { wDiff: number; rDiff: number; positive: boolean; neutral: boolean };

function getDelta(sessions: ExerciseSession[]): Delta | null {
  if (sessions.length < 2) return null;
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const wDiff = +(last.topWeight - prev.topWeight).toFixed(2);
  const rDiff = last.topReps - prev.topReps;
  return {
    wDiff,
    rDiff,
    positive: wDiff > 0 || (wDiff === 0 && rDiff > 0),
    neutral:  wDiff === 0 && rDiff === 0,
  };
}

function deltaText(d: Delta): string {
  const parts: string[] = [];
  if (d.wDiff !== 0) parts.push(`${d.wDiff > 0 ? "+" : ""}${d.wDiff} kg`);
  if (d.rDiff !== 0) parts.push(`${d.rDiff > 0 ? "+" : ""}${d.rDiff} rep${Math.abs(d.rDiff) !== 1 ? "s" : ""}`);
  return parts.join("  ·  ") || "No change";
}

function getInsight(p: ExerciseProgression): string {
  const target = computeNextTarget(p.recentSessions, p.trend);
  if (!target) return "Log one more session to unlock insights.";

  const repsStr =
    target.repsMin === target.repsMax
      ? `${target.repsMin}`
      : `${target.repsMin}–${target.repsMax}`;

  return `Next session → ${target.weight} kg × ${repsStr} reps · ${target.note}`;
}

function computeOverview(progressions: ExerciseProgression[]) {
  const withPrev = progressions.filter((p) => p.recentSessions.length >= 2);

  const improvingCount = withPrev.filter((p) => {
    const d = getDelta(p.recentSessions);
    return d && (d.wDiff > 0 || d.rDiff > 0);
  }).length;

  const wDeltas = withPrev
    .map((p) => getDelta(p.recentSessions))
    .filter((d): d is Delta => d !== null)
    .map((d) => d.wDiff)
    .filter((d) => d !== 0);
  const avgStrength =
    wDeltas.length > 0 ? +(wDeltas.reduce((s, d) => s + d, 0) / wDeltas.length).toFixed(1) : 0;

  const lastVol = withPrev.reduce(
    (s, p) => s + p.recentSessions[p.recentSessions.length - 1].totalVolume, 0
  );
  const prevVol = withPrev.reduce(
    (s, p) => s + p.recentSessions[p.recentSessions.length - 2].totalVolume, 0
  );
  const volPct = prevVol > 0 ? Math.round(((lastVol - prevVol) / prevVol) * 100) : 0;

  return { improvingCount, total: progressions.length, avgStrength, volPct };
}

// ─── Overview Tile ────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 bg-zinc-900/40 border border-zinc-800/30 rounded-2xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{label}</p>
      <p className={`text-xl font-black leading-none ${valueColor ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Exercise Progress Card ────────────────────────────────────────────────────

function ExerciseCard({
  p,
  onTap,
}: {
  p: ExerciseProgression;
  onTap: () => void;
}) {
  const delta   = getDelta(p.recentSessions);
  const t       = TREND[p.trend];
  const insight = getInsight(p);

  const deltaColor = !delta || delta.neutral
    ? "text-zinc-500"
    : delta.positive
    ? "text-emerald-400"
    : "text-red-400";

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900/40 border border-zinc-800/30 rounded-[18px] px-5 py-4 hover:bg-zinc-800/40 hover:border-zinc-700/30 active:scale-[0.98] transition-all duration-150"
    >
      {/* Row 1: name + trend */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[15px] font-black text-white leading-snug truncate">{p.name}</p>
          {p.muscleGroups.length > 0 && (
            <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{p.muscleGroups.join(" · ")}</p>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${t.bg} ${t.color}`}>
          {t.label}
        </span>
      </div>

      {/* Row 2: delta */}
      <p className={`text-sm font-semibold tabular-nums mb-3 ${deltaColor}`}>
        {delta ? `${deltaText(delta)} vs last session` : "First session — log one more to compare"}
      </p>

      {/* Row 3: sparkline */}
      {p.recentSessions.length >= 2 && (
        <div className="mb-3">
          <SparkLine data={p.recentSessions.map((s) => s.topWeight)} height={28} color={t.spark} />
        </div>
      )}

      {/* Row 4: insight */}
      <p className="text-[11px] text-zinc-600 leading-relaxed">{insight}</p>
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  progressions: ExerciseProgression[];
  onTapExercise: (p: ExerciseProgression) => void;
};

const TREND_ORDER: Record<string, number> = { up: 0, flat: 1, down: 2, none: 3 };

export default function ProgressScreen({ progressions, onTapExercise }: Props) {
  const overview = computeOverview(progressions);

  const sorted = [...progressions].sort(
    (a, b) => TREND_ORDER[a.trend] - TREND_ORDER[b.trend]
  );

  const noData = progressions.length === 0;

  return (
    <>
      {/* Header */}
      <header className="mb-8">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          AP-Tracking
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight leading-none">Progress</h1>
      </header>

      {noData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-zinc-400 text-base font-bold mb-1">No data yet</p>
          <p className="text-zinc-600 text-sm">Complete workouts to track your progress.</p>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="flex gap-3 mb-8">
            <Tile
              label="Improving"
              value={`${overview.improvingCount}/${overview.total}`}
              sub="exercises"
              valueColor={
                overview.improvingCount > overview.total / 2 ? "text-emerald-400" : "text-amber-400"
              }
            />
            <Tile
              label="Strength"
              value={overview.avgStrength !== 0 ? `${overview.avgStrength > 0 ? "+" : ""}${overview.avgStrength} kg` : "—"}
              sub="avg vs last"
              valueColor={
                overview.avgStrength > 0
                  ? "text-emerald-400"
                  : overview.avgStrength < 0
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            />
            <Tile
              label="Volume"
              value={overview.volPct !== 0 ? `${overview.volPct > 0 ? "+" : ""}${overview.volPct}%` : "—"}
              sub="vs last session"
              valueColor={
                overview.volPct > 0
                  ? "text-emerald-400"
                  : overview.volPct < 0
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            />
          </div>

          {/* Exercise cards */}
          <div className="space-y-4">
            {sorted.map((p) => (
              <ExerciseCard key={p.name} p={p} onTap={() => onTapExercise(p)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
