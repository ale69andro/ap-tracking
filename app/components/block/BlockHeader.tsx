import type { TrainingBlock, TrainingBlockStatus } from "@/app/types";
import { addDays, getBlockTimeline } from "@/lib/analysis/blockDates";
import { formatFullDate } from "@/app/lib/blockFormat";

export const BLOCK_STATUS_CONFIG: Record<TrainingBlockStatus, { label: string; chip: string }> = {
  active:    { label: "Aktiv",       chip: "bg-red-500/10 border-red-500/30 text-red-400" },
  completed: { label: "Beendet",     chip: "bg-zinc-700/30 border-zinc-700/40 text-zinc-300" },
  cancelled: { label: "Abgebrochen", chip: "bg-zinc-800/50 border-zinc-700/40 text-zinc-500" },
};

type Props = {
  block: TrainingBlock;
  today: string;
};

export default function BlockHeader({ block, today }: Props) {
  const status   = BLOCK_STATUS_CONFIG[block.status];
  const timeline = getBlockTimeline(block.startDate, block.lengthWeeks, today);
  const lastDay  = addDays(block.startDate, block.lengthWeeks * 7 - 1);
  const isActive = block.status === "active";
  const endedEarly = !isActive && block.endedAt !== undefined && block.endedAt < lastDay;

  return (
    <section className="mb-6 px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs text-zinc-400 tabular-nums">
          {formatFullDate(block.startDate)} – {formatFullDate(lastDay)}
        </p>
        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${status.chip}`}>
          {status.label}
        </span>
      </div>

      {isActive ? (
        <>
          <p className="text-3xl font-black text-white leading-none tabular-nums">
            {timeline.notStarted ? "Noch nicht gestartet" : `Woche ${timeline.currentWeek}`}
            {!timeline.notStarted && (
              <span className="text-base font-normal text-zinc-500 ml-2">von {block.lengthWeeks}</span>
            )}
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-600 transition-[width]"
              style={{ width: `${timeline.notStarted ? 0 : (timeline.currentWeek / block.lengthWeeks) * 100}%` }}
            />
          </div>
          {timeline.expired && (
            <p className="mt-3 text-sm text-amber-400">
              Die geplante Blocklänge ist erreicht. Beende den Block, um einen neuen zu starten.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-3xl font-black text-white leading-none tabular-nums">
            {block.lengthWeeks}
            <span className="text-base font-normal text-zinc-500 ml-2">Wochen</span>
          </p>
          {endedEarly && block.endedAt && (
            <p className="mt-2 text-xs text-zinc-400">
              Vorzeitig {block.status === "cancelled" ? "abgebrochen" : "beendet"} am {formatFullDate(block.endedAt)} – spätere Einheiten zählen nicht.
            </p>
          )}
        </>
      )}
    </section>
  );
}
