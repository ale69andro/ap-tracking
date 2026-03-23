"use client";

import type { TrainingDay } from "@/app/types";
import { ChevronRight, ArrowRight } from "lucide-react";

interface Props {
  plan: { name: string } | null;
  nextDay: TrainingDay | null;
  nextDayIndex: number | null;
  nextDayTemplateName?: string;
  lastCompletedDay: TrainingDay | null;
  lastCompletedAt: number | null;
  lastDayTemplateName?: string;
  coachHint?: string;
  onStart: (day: TrainingDay, dayIndex: number) => void;
  onSetup: () => void;
}

export default function TrainingDayCard({
  plan,
  nextDay,
  nextDayIndex,
  nextDayTemplateName,
  lastCompletedDay,
  lastCompletedAt,
  lastDayTemplateName,
  coachHint,
  onStart,
  onSetup,
}: Props) {
  // No plan — show setup prompt
  if (!plan) {
    return (
      <button
        onClick={onSetup}
        className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3.5 mb-4 hover:border-zinc-700 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-500">Training Plan</span>
        <span className="inline-flex items-center gap-1 text-xs text-zinc-600">Set up sequence <ChevronRight size={13} /></span>
      </button>
    );
  }

  const lastDate = lastCompletedAt
    ? new Date(lastCompletedAt).toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short",
      })
    : null;

  const nextLabel = nextDay
    ? `Day ${nextDay.dayNumber}${nextDayTemplateName ? ` – ${nextDayTemplateName}` : ""}`
    : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3.5 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">
            Next Up
          </p>
          <p className="text-base font-black text-white truncate">
            {nextLabel ?? "—"}
          </p>
          {lastCompletedDay && (
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {`Last: Day ${lastCompletedDay.dayNumber}${lastDayTemplateName ? ` – ${lastDayTemplateName}` : ""}`}
              {lastDate ? ` · ${lastDate}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSetup}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1"
          >
            Edit
          </button>
          {nextDay && nextDayIndex !== null && (
            <button
              onClick={() => onStart(nextDay, nextDayIndex)}
              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-black tracking-wider uppercase px-3 py-2 rounded-xl transition-colors"
            >
              Start <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
      {coachHint && (
        <p className="text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800/60">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            Coach ·{" "}
          </span>
          {coachHint}
        </p>
      )}
    </div>
  );
}
