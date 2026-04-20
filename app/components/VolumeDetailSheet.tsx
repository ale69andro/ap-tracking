"use client";

import { X } from "lucide-react";
import type { WeeklyVolumeResult } from "@/lib/analysis/getWeeklyVolumeByMuscleGroup";
import VolumeOverviewCard from "./VolumeOverviewCard";

export default function VolumeDetailSheet({
  data,
  onClose,
}: {
  data: WeeklyVolumeResult;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800/50 rounded-t-3xl px-4 pt-4 pb-10 overflow-y-auto max-h-[85vh]">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

        {/* Sheet header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-[15px] font-black text-white">Volume Analysis</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800/60 text-zinc-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mb-5">This week vs last week</p>

        {/* Full volume breakdown */}
        <VolumeOverviewCard data={data} />
      </div>
    </div>
  );
}
