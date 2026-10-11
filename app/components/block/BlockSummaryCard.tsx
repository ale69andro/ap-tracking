import type { BlockExerciseRow, BlockVerdict } from "@/app/types";
import { formatSignedKg, formatSignedPct } from "@/app/lib/blockFormat";
import ExerciseName from "../ExerciseName";

const VERDICT_CONFIG: Record<BlockVerdict["status"], { color: string; arrow: string }> = {
  up:           { color: "text-emerald-400", arrow: "↑" },
  flat:         { color: "text-zinc-400",    arrow: "→" },
  down:         { color: "text-red-400",     arrow: "↓" },
  insufficient: { color: "text-zinc-600",    arrow: "·" },
};

type Props = {
  ranking: BlockExerciseRow[];
  /** templateId → training day label */
  dayLabels: Record<string, string>;
};

export default function BlockSummaryCard({ ranking, dayLabels }: Props) {
  if (ranking.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-red-500 mb-0.5">Auswertung</p>
        <h2 className="text-lg font-black text-white">Block-Fazit</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Ø e1RM der ersten 2 gegen die letzten 2 Einheiten, größter Zuwachs zuerst
        </p>
      </div>
      <ul className="divide-y divide-zinc-800/70">
        {ranking.map((row) => {
          const { verdict } = row;
          const config = VERDICT_CONFIG[verdict.status];
          const isDown = verdict.status === "down";
          return (
            <li
              key={row.key}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${isDown ? "bg-red-500/10" : ""}`}
            >
              <div className="min-w-0">
                <ExerciseName name={row.exerciseName} className="text-sm font-bold text-white truncate" />
                <p className="text-xs text-zinc-400 truncate">{dayLabels[row.templateId]}</p>
                {verdict.sampleSize === 1 && <p className="text-[11px] text-zinc-500">wenig Daten</p>}
              </div>
              {verdict.deltaPct === null || verdict.deltaKg === null ? (
                <p className="shrink-0 text-xs text-zinc-500">zu wenig Daten</p>
              ) : (
                <div className={`shrink-0 text-right tabular-nums ${config.color}`}>
                  {isDown && (
                    <p className="text-[11px] font-bold uppercase tracking-wide">Rückschritt</p>
                  )}
                  <p className="text-base font-black leading-tight whitespace-nowrap">
                    {config.arrow} {formatSignedPct(verdict.deltaPct)}
                  </p>
                  <p className="text-xs opacity-80">{formatSignedKg(verdict.deltaKg)}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
