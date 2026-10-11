import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Entry point to the Block view — rendered at the top of the Progress tab. */
export default function BlockEntryCard() {
  return (
    <Link
      href="/block"
      className="flex items-center justify-between gap-3 mb-6 px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-0.5">Trainingsblock</p>
        <p className="text-sm font-bold text-white">Kraftverlauf über 4, 8 oder 12 Wochen</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-zinc-500" />
    </Link>
  );
}
