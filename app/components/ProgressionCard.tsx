import type { ExerciseProgression, ExerciseSession } from "@/app/types";
import SparkLine from "./SparkLine";

const TREND_CONFIG = {
  up:   { label: "Progressing",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", arrow: "↑", spark: "#10b981" },
  flat: { label: "Plateau",         color: "text-zinc-400",    bg: "bg-zinc-700/30 border-zinc-700/30",       arrow: "→", spark: "#71717a" },
  down: { label: "Declining",       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         arrow: "↓", spark: "#f87171" },
  none: { label: "Not enough data", color: "text-zinc-600",    bg: "bg-zinc-800/50 border-zinc-700/40",       arrow: "·", spark: "#52525b" },
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
};

export default function ProgressionCard({ progression, onTap }: Props) {
  const { name, muscleGroups, bestWeight, recentSessions, trend } = progression;
  const t     = TREND_CONFIG[trend];
  const delta = buildDelta(recentSessions);

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

      {/* Delta vs last session */}
      {delta ? (
        <p className={`text-xs font-semibold tabular-nums mb-3 ${
          delta.neutral ? "text-zinc-500" : delta.positive ? "text-emerald-400" : "text-red-400"
        }`}>
          {delta.text} vs last session
        </p>
      ) : (
        <p className="text-xs text-zinc-600 mb-3">First session</p>
      )}

      {/* Sparkline */}
      {recentSessions.length >= 2 && (
        <div className="mb-3">
          <SparkLine
            data={recentSessions.map((s) => s.topWeight)}
            height={32}
            color={t.spark}
          />
        </div>
      )}

      {/* Best weight */}
      <p className="text-[11px] text-zinc-600 font-medium tabular-nums">
        Best — <span className="text-zinc-400 font-bold">{bestWeight > 0 ? `${bestWeight} kg` : "—"}</span>
      </p>
    </button>
  );
}
