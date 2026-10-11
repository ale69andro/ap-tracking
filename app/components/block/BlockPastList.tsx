import { ChevronRight } from "lucide-react";
import type { TrainingBlock } from "@/app/types";
import { addDays } from "@/lib/analysis/blockDates";
import { formatFullDate } from "@/app/lib/blockFormat";
import { BLOCK_STATUS_CONFIG } from "./BlockHeader";

type Props = {
  blocks: TrainingBlock[];
  onSelect: (id: string) => void;
};

export default function BlockPastList({ blocks, onSelect }: Props) {
  if (blocks.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Weitere Blöcke</h2>
      <div className="space-y-2">
        {blocks.map((block) => {
          const status = BLOCK_STATUS_CONFIG[block.status];
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onSelect(block.id)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left active:bg-zinc-800 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{block.lengthWeeks} Wochen</p>
                <p className="text-xs text-zinc-400 tabular-nums">
                  {formatFullDate(block.startDate)} – {formatFullDate(addDays(block.startDate, block.lengthWeeks * 7 - 1))}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${status.chip}`}>
                {status.label}
              </span>
              <ChevronRight size={16} className="shrink-0 text-zinc-600" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
