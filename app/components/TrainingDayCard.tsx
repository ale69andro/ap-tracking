"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TrainingDay, WorkoutTemplate } from "@/app/types";
import { ChevronRight, ArrowRight } from "lucide-react";
import { CoachLabel } from "./CoachLabel";

interface Props {
  plan: { name: string; days: TrainingDay[] } | null;
  nextDay: TrainingDay | null;
  nextDayIndex: number | null;
  templates: WorkoutTemplate[];
  lastCompletedDay: TrainingDay | null;
  lastCompletedAt: number | null;
  coachHint?: string;
  onStart: (day: TrainingDay, dayIndex: number) => void;
  onSetup: () => void;
}

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

const slideTransition = { duration: 0.22, ease: "easeOut" } as const;

export default function TrainingDayCard({
  plan,
  nextDay,
  nextDayIndex,
  templates,
  lastCompletedDay,
  lastCompletedAt,
  coachHint,
  onStart,
  onSetup,
}: Props) {
  // previewIndex: currently displayed day; syncedFrom: the nextDayIndex it was last reset to.
  // direction: 1 = forward (left swipe), -1 = backward (right swipe), used for slide animation.
  const [{ previewIndex, syncedFrom, direction }, setPreviewState] = useState({
    previewIndex: nextDayIndex ?? 0,
    syncedFrom: nextDayIndex,
    direction: 1,
  });

  // Derived-state reset: when nextDayIndex changes (e.g. after completing a workout),
  // snap preview back to the real next day without an animation.
  if (syncedFrom !== nextDayIndex && nextDayIndex !== null) {
    setPreviewState({ previewIndex: nextDayIndex, syncedFrom: nextDayIndex, direction: 1 });
  }

  const touchStartX = useRef<number | null>(null);

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

  const multiDay = plan.days.length > 1;
  const previewDay = multiDay ? plan.days[previewIndex] : nextDay;
  const isRealNext = !multiDay || previewIndex === nextDayIndex;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    const n = plan.days.length;
    const dir = delta < 0 ? 1 : -1;
    setPreviewState((s) => ({
      previewIndex: dir === 1 ? (s.previewIndex + 1) % n : (s.previewIndex - 1 + n) % n,
      syncedFrom: s.syncedFrom,
      direction: dir,
    }));
  };

  const resolveTemplateName = (day: TrainingDay | null) =>
    day?.templateId ? (templates.find((t) => t.id === day.templateId)?.name ?? day.label) : day?.label;

  const previewTemplateName = resolveTemplateName(previewDay);
  const lastDayTemplateName = resolveTemplateName(lastCompletedDay);

  const displayLabel = previewDay
    ? `Day ${previewDay.dayNumber}${previewTemplateName ? ` – ${previewTemplateName}` : ""}`
    : null;

  const lastDate = lastCompletedAt
    ? new Date(lastCompletedAt).toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short",
      })
    : null;

  return (
    <div
      className="bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3.5 mb-4"
      onTouchStart={multiDay ? handleTouchStart : undefined}
      onTouchEnd={multiDay ? handleTouchEnd : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              {isRealNext ? "Next in Plan" : "Plan Day"}
            </p>
            {multiDay && (
              <p className="text-[10px] text-zinc-700">
                {previewIndex + 1} / {plan.days.length}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={previewIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              <p className="text-base font-black text-white truncate">
                {displayLabel ?? "—"}
              </p>
              {lastCompletedDay && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest leading-tight">Last completed</p>
                  <p className="text-[11px] text-zinc-600 leading-tight">
                    {`Day ${lastCompletedDay.dayNumber}${lastDayTemplateName ? ` – ${lastDayTemplateName}` : ""}`}
                    {lastDate ? ` · ${lastDate}` : ""}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSetup}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1"
          >
            Edit
          </button>
          {previewDay && (
            <button
              onClick={() => onStart(previewDay, previewIndex)}
              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-black tracking-wider uppercase px-3 py-2 rounded-xl transition-colors"
            >
              Start <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
      {coachHint && isRealNext && (
        <div className="mt-2 pt-2 border-t border-zinc-800/60">
          <CoachLabel />
          <p className="text-[11px] text-zinc-500">{coachHint}</p>
        </div>
      )}
    </div>
  );
}
