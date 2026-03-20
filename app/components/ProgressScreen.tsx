"use client";

import type { ExerciseProgression, ExerciseSession } from "@/app/types";
import { computeNextTarget } from "@/app/lib/recommendations";
import { calculateEpley1RM } from "@/lib/analysis/exerciseMetrics";
import SparkLine from "./SparkLine";

// ─── Config ───────────────────────────────────────────────────────────────────

const TREND = {
  up:   { label: "Progressing", color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30", spark: "#10b981", glow: "#10b98126" },
  flat: { label: "Plateau",     color: "text-amber-400",   bg: "bg-amber-500/15  border-amber-500/30",    spark: "#f59e0b", glow: "#f59e0b26" },
  down: { label: "Declining",   color: "text-red-400",     bg: "bg-red-500/15    border-red-500/30",      spark: "#f87171", glow: "#f8717126" },
  none: { label: "New",         color: "text-zinc-400",    bg: "bg-zinc-800/50   border-zinc-700/30",     spark: "#52525b", glow: "transparent" },
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

function getPrimaryInsight(p: ExerciseProgression, delta: Delta | null): string {
  // Prefer the smarter interpretation layer when available
  if (p.analysis?.interpretation) return p.analysis.interpretation.title;

  // Fallback: delta-pattern text for exercises without analysis
  if (!delta) return "First session recorded";
  if (delta.neutral) return "Strength holding steady";
  const { wDiff, rDiff } = delta;
  if (wDiff < 0 && rDiff > 0) return "More reps with less weight";
  if (wDiff > 0 && rDiff < 0) return "Heavier weight, slight rep drop";
  if (wDiff > 0 && rDiff > 0) return "Heavier and more reps";
  if (wDiff === 0 && rDiff > 0) return "More reps at the same weight";
  if (wDiff === 0 && rDiff < 0) return "Lost reps at the same weight";
  if (wDiff > 0 && rDiff === 0) return "Stronger at the same reps";
  if (wDiff < 0 && rDiff === 0) return "Same reps, less weight";
  return delta.positive ? "Strength trending up" : "Output trending down";
}

// ─── Delta Metrics chips (weight + reps, each colored by own sign) ───────────

function deltaColor(n: number): string {
  return n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-zinc-500";
}

function DeltaMetrics({ delta }: { delta: Delta | null }) {
  if (!delta) {
    return <p className="text-[11px] text-zinc-600 mb-3">First session — log one more to compare</p>;
  }
  if (delta.neutral) {
    return <p className="text-[11px] text-zinc-500 mb-3">Same top set as last session</p>;
  }
  return (
    <div className="flex items-center gap-2.5 mb-3 text-[11px] text-zinc-600">
      {delta.wDiff !== 0 && (
        <span className="flex items-center gap-1">
          <span>Weight</span>
          <span className={`font-medium tabular-nums ${deltaColor(delta.wDiff)}`}>
            {delta.wDiff > 0 ? "+" : ""}{delta.wDiff} kg
          </span>
        </span>
      )}
      {delta.wDiff !== 0 && delta.rDiff !== 0 && (
        <span className="text-zinc-800">·</span>
      )}
      {delta.rDiff !== 0 && (
        <span className="flex items-center gap-1">
          <span>Reps</span>
          <span className={`font-medium tabular-nums ${deltaColor(delta.rDiff)}`}>
            {delta.rDiff > 0 ? "+" : ""}{delta.rDiff}
          </span>
        </span>
      )}
      <span className="text-zinc-800">vs last</span>
    </div>
  );
}

function getChartInterpretation(p: ExerciseProgression): string | null {
  if (p.recentSessions.length < 2) return null;
  // Prefer the interpretation subtitle — more nuanced than the 3-state trend
  return p.analysis?.interpretation?.subtitle ?? null;
}

function getActionText(p: ExerciseProgression): string {
  const trend = p.analysis?.trend;
  const conf  = p.analysis?.confidence;
  const w     = p.analysis?.suggestedNextWeight;
  const reps  = p.analysis?.suggestedRepRange;

  if (trend === "regressing") {
    if (w != null && reps != null) {
      return conf === "high"
        ? `Deload to ${w} kg × ${reps} reps — stop the decline`
        : `Step back to ${w} kg × ${reps} reps`;
    }
    return "Reduce load — focus on form and consistency";
  }

  if (trend === "stagnating") {
    if (w != null && reps != null) {
      return conf === "high"
        ? `Plateau detected — push to ${w} kg × ${reps} reps`
        : `Try ${w} kg × ${reps} reps to break the plateau`;
    }
    return "Hold weight — push for +1 rep next session";
  }

  if (trend === "progressing" && w != null && reps != null) {
    return `Keep going — next: ${w} kg × ${reps} reps`;
  }

  // Fallback to computeNextTarget
  const target = computeNextTarget(p.recentSessions, p.trend);
  if (target) {
    const repsStr = target.repsMin === target.repsMax
      ? `${target.repsMin}`
      : `${target.repsMin}–${target.repsMax}`;
    return `Next → ${target.weight} kg × ${repsStr} reps`;
  }

  // Last resort: coaching note from the interpretation layer
  return p.analysis?.interpretation?.recommendation ?? "Keep logging to unlock insights";
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

// ─── Focus Priority ───────────────────────────────────────────────────────────

function getFocusScore(p: ExerciseProgression): number {
  const trend = p.analysis?.trend;
  const conf  = p.analysis?.confidence;
  let score = 0;
  if (trend === "regressing")       score += 300;
  else if (trend === "stagnating")  score += 200;
  else if (trend === "progressing") score += 100;
  if (conf === "high")              score += 30;
  else if (conf === "medium")       score += 20;
  else if (conf === "low")          score += 10;
  return score;
}

// ─── Next Action Block ────────────────────────────────────────────────────────

function NextAction({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 mt-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-3.5 py-2.5">
      <span className="text-zinc-500 text-xs shrink-0">▶</span>
      <p className="text-[13px] font-semibold text-white leading-snug">{text}</p>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</p>
      <span className="text-[10px] text-zinc-700 font-bold">{count}</span>
      <div className="flex-1 h-px bg-zinc-800/60" />
    </div>
  );
}

// ─── Focus Today Card ─────────────────────────────────────────────────────────

function FocusTodayCard({ p, onTap }: { p: ExerciseProgression; onTap: () => void }) {
  const delta  = getDelta(p.recentSessions);
  const t      = TREND[resolvedTrendKey(p)];
  const action = getActionText(p);

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900/60 border rounded-[18px] px-5 py-4 mb-8 hover:bg-zinc-800/60 active:scale-[0.98] transition-all duration-150"
      style={{ borderColor: `${t.spark}50` }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Focus Today</p>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[15px] font-black text-white leading-snug truncate">{p.name}</p>
        <span
          className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${t.bg} ${t.color}`}
          style={{ boxShadow: `0 0 10px ${t.glow}` }}
        >
          {t.label}
        </span>
      </div>
      <p
        className={`text-[18px] font-black leading-snug mb-3 ${t.color}`}
        style={{ textShadow: `0 0 28px ${t.spark}4D` }}
      >
        {getPrimaryInsight(p, delta)}
      </p>
      <NextAction text={action} />
    </button>
  );
}

// ─── Exercise Progress Card ────────────────────────────────────────────────────

function resolvedTrendKey(p: ExerciseProgression): keyof typeof TREND {
  if (p.analysis?.trend === "progressing") return "up";
  if (p.analysis?.trend === "stagnating")  return "flat";
  if (p.analysis?.trend === "regressing")  return "down";
  return p.trend;
}

function ExerciseCard({
  p,
  onTap,
}: {
  p: ExerciseProgression;
  onTap: () => void;
}) {
  const delta         = getDelta(p.recentSessions);
  const t             = TREND[resolvedTrendKey(p)];
  const insight       = getActionText(p);
  const chartCaption  = getChartInterpretation(p);
  const sessionCount  = p.recentSessions.length;
  const isEarlyData   = sessionCount < 4;

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
        <span
          className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${t.bg} ${t.color}`}
          style={{ boxShadow: `0 0 10px ${t.glow}` }}
        >
          {t.label}
        </span>
      </div>

      {/* Row 2: primary insight + delta chips */}
      <p
        className={`text-[18px] font-black leading-snug mb-3 ${t.color}`}
        style={{ textShadow: `0 0 28px ${t.spark}4D` }}
      >
        {getPrimaryInsight(p, delta)}
      </p>
      <div style={{ opacity: 0.88 }}>
        <DeltaMetrics delta={delta} />
      </div>

      {/* Row 3: sparkline — adapts to available data */}
      {sessionCount >= 2 && (
        <div className={`mb-3${isEarlyData ? " opacity-70" : ""}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 mb-1">
            {sessionCount >= 4 ? "E1RM · recent signal" : `E1RM · ${sessionCount}-session view`}
          </p>
          <SparkLine
            data={p.recentSessions.slice(-Math.min(sessionCount, 4)).map((s) => calculateEpley1RM(s.topWeight, s.topReps))}
            height={sessionCount === 2 ? 34 : 52}
            color={t.spark}
            minRangePct={sessionCount >= 3 ? 0.06 : 0}
          />
          {chartCaption && sessionCount >= 3 && (
            <p className={`text-[10px] font-semibold mt-1 ${t.color}`} style={{ opacity: 0.7 }}>
              {chartCaption}
            </p>
          )}
          {isEarlyData && (
            <p className="text-[9px] text-zinc-600 mt-1.5">
              Early trend — {4 - sessionCount} more session{4 - sessionCount !== 1 ? "s" : ""} improve{4 - sessionCount !== 1 ? "" : "s"} accuracy
            </p>
          )}
        </div>
      )}

      {/* Row 4: next action */}
      <NextAction text={insight} />

      {/* Row 5: low-confidence notice */}
      {p.analysis?.confidence === "low" && (
        <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed">
          Based on {p.recentSessions.length} session{p.recentSessions.length === 1 ? "" : "s"} — more data improves accuracy
        </p>
      )}
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  progressions: ExerciseProgression[];
  onTapExercise: (p: ExerciseProgression) => void;
};

const SECTION_CONFIG = [
  { key: "up",   label: "Progressing",     color: "text-emerald-500" },
  { key: "down", label: "Needs Attention", color: "text-red-500"     },
  { key: "flat", label: "Plateau",         color: "text-amber-500"   },
  { key: "none", label: "New",             color: "text-zinc-500"    },
] as const;

function groupProgressions(progressions: ExerciseProgression[]) {
  const map = new Map<string, ExerciseProgression[]>(
    SECTION_CONFIG.map(s => [s.key, []])
  );
  for (const p of progressions) {
    map.get(resolvedTrendKey(p))!.push(p);
  }
  return SECTION_CONFIG
    .map(s => ({
      ...s,
      // Sort within each group: highest confidence (most actionable signal) first
      items: map.get(s.key)!.sort((a, b) => getFocusScore(b) - getFocusScore(a)),
    }))
    .filter(s => s.items.length > 0);
}

export default function ProgressScreen({ progressions, onTapExercise }: Props) {
  const overview = computeOverview(progressions);
  const groups   = groupProgressions(progressions);
  const focus    = progressions.length >= 2
    ? [...progressions].sort((a, b) => getFocusScore(b) - getFocusScore(a))[0]
    : null;

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

          {/* Focus Today */}
          {focus && (
            <FocusTodayCard p={focus} onTap={() => onTapExercise(focus)} />
          )}

          {/* Exercise cards grouped by trend */}
          <div>
            {groups.map((group) => (
              <div key={group.key}>
                <SectionHeader label={group.label} color={group.color} count={group.items.length} />
                <div className="space-y-4">
                  {group.items.map((p) => (
                    <ExerciseCard key={p.name} p={p} onTap={() => onTapExercise(p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
