import type { BlockEntry } from "@/app/types";
import {
  deltaColor,
  formatDayMonth,
  formatKg,
  formatSet,
  formatSignedKg,
  formatSignedPct,
} from "@/app/lib/blockFormat";

type Props = { entries: BlockEntry[] };

/** All sessions of one series: set, e1RM, change vs baseline and vs the previous session. */
export default function BlockEntryList({ entries }: Props) {
  return (
    <ul className="px-4 pb-3 space-y-2">
      {entries.map((entry, i) => (
        <li key={entry.sessionId} className="px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-zinc-400 tabular-nums">
              <span className="font-bold text-zinc-300">W{entry.weekIndex}</span> · {formatDayMonth(entry.dateKey)}
            </p>
            <p className="text-xs text-zinc-400 tabular-nums">
              e1RM <span className="font-bold text-zinc-300">{formatKg(entry.e1rm)} kg</span>
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <p className="text-lg font-black text-white tabular-nums leading-tight">
              {formatSet(entry.bestSet)}
            </p>
            {i === 0 ? (
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-400">Startwert</p>
            ) : (
              <p className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${deltaColor(entry.deltaVsStartKg)}`}>
                {formatSignedKg(entry.deltaVsStartKg)}
                {entry.deltaVsStartPct !== null && (
                  <span className="font-normal opacity-80"> ({formatSignedPct(entry.deltaVsStartPct)})</span>
                )}
              </p>
            )}
          </div>
          {entry.deltaVsPrevKg !== null && (
            <p className="mt-0.5 text-right text-xs text-zinc-400 tabular-nums">
              zur vorherigen Einheit{" "}
              <span className={`font-bold ${deltaColor(entry.deltaVsPrevKg)}`}>
                {formatSignedKg(entry.deltaVsPrevKg)}
                {entry.deltaVsPrevPct !== null && ` (${formatSignedPct(entry.deltaVsPrevPct)})`}
              </span>
            </p>
          )}
          {entry.e1rmUnreliable && (
            <p className="mt-1 text-xs text-amber-400">e1RM ungenau (mehr als 12 Wdh)</p>
          )}
        </li>
      ))}
    </ul>
  );
}
