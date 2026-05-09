"use client";

import { CoachLabel } from "../CoachLabel";
import type { TrainingDay, WorkoutTemplate } from "@/app/types";

type TodayFocusCardProps = {
  nextDay: TrainingDay | null;
  nextDayIndex: number | null;
  allTemplates: WorkoutTemplate[];
  planName?: string;
  coachHint?: string;
  onStartFromDay: (day: TrainingDay, dayIndex: number) => void;
  onSetupPlan: () => void;
  onSkipDay?: () => void;
};

export default function TodayFocusCard({
  nextDay,
  nextDayIndex,
  allTemplates,
  planName,
  coachHint,
  onStartFromDay,
  onSetupPlan,
  onSkipDay,
}: TodayFocusCardProps) {
  if (!nextDay || nextDayIndex === null) {
    return null;
  }

  const linkedTemplate = allTemplates.find((t) => t.id === nextDay.templateId);
  const muscleGroups = linkedTemplate
    ? Array.from(new Set(linkedTemplate.exercises.flatMap((e) => e.muscleGroups)))
    : [];

  const dayName = nextDay.label ?? `Day ${nextDay.dayNumber}`;
  const title = planName ? `${dayName} — ${planName}` : dayName;

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Today&apos;s Training</p>

      <p className="text-base font-bold text-white leading-tight">{title}</p>
      {muscleGroups.length > 0 && (
        <p className="text-xs text-zinc-500 mt-1">{muscleGroups.join(" · ")}</p>
      )}

      {coachHint && (
        <div className="mt-3 pt-3 border-t border-zinc-800/60">
          <CoachLabel />
          <p className="text-[11px] text-zinc-500">{coachHint}</p>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onStartFromDay(nextDay, nextDayIndex)}
          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs tracking-wide transition-colors"
        >
          Start
        </button>
        <button
          onClick={onSetupPlan}
          className="px-4 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs transition-colors"
        >
          Edit
        </button>
        {onSkipDay && (
          <button
            onClick={onSkipDay}
            className="px-4 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 font-semibold text-xs transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
