"use client";

import { ChevronRight } from "lucide-react";
import type { WeeklyVolumeResult } from "@/lib/analysis/getWeeklyVolumeByMuscleGroup";
import { getVolumePreviewText } from "@/lib/analysis/getWeeklyVolumeByMuscleGroup";

export default function VolumePreviewCard({
  data,
  onOpen,
}: {
  data: WeeklyVolumeResult;
  onOpen: () => void;
}) {
  const summary = getVolumePreviewText(data);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-zinc-900/40 border border-zinc-800/30 rounded-2xl px-4 py-3.5 mb-8 flex items-center gap-3 hover:bg-zinc-800/40 active:scale-[0.98] transition-all duration-150"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Volume</p>
        <p className="text-[13px] text-zinc-300 font-medium leading-snug truncate">{summary}</p>
      </div>
      <ChevronRight size={16} className="text-zinc-600 shrink-0" />
    </button>
  );
}
