"use client";

import { useRef, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { ExerciseCardBody, type ExerciseCardBodyProps } from "./ExerciseCard";
import RestTimer from "./RestTimer";
import { getTimerRemaining } from "@/app/hooks/useWorkout";

type Props = ExerciseCardBodyProps & {
  focusedIndex: number;
  totalCount: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Optional: opens the progression detail sheet for this exercise */
  onViewDetail?: () => void;
  /** Name of the exercise that owns the active timer — used for context label when navigated away */
  timerExerciseName?: string;
};

export default function FocusedExerciseOverlay({
  exercise,
  activeTimer,
  focusedIndex,
  totalCount,
  canGoNext,
  canGoPrev,
  onClose,
  onNavigate,
  onViewDetail,
  timerExerciseName,
  ...bodyProps
}: Props) {
  // ── Timer state (derived — never stored) ──────────────────────────────────
  const isTimerForThisExercise =
    activeTimer !== null && exercise.sets.some((s) => s.id === activeTimer.setId);
  const timerRemaining = activeTimer !== null ? getTimerRemaining(activeTimer) : 0;
  const timerDone = activeTimer !== null && timerRemaining === 0;

  // ── Header swipe gesture ──────────────────────────────────────────────────
  // Attached to the top bar only — avoids any conflict with SetRow's
  // swipe-to-delete (which lives in the scrollable content area).
  const swipeRef = useRef<{ startX: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    swipeRef.current = { startX: e.clientX };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!swipeRef.current) return;
      const dx = e.clientX - swipeRef.current.startX;
      swipeRef.current = null;
      if (dx < -80 && canGoNext) onNavigate(focusedIndex + 1);
      else if (dx > 80 && canGoPrev) onNavigate(focusedIndex - 1);
    },
    [canGoNext, canGoPrev, onNavigate, focusedIndex],
  );

  const handlePointerCancel = useCallback(() => {
    swipeRef.current = null;
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 border-b border-zinc-800/80 bg-zinc-950 select-none shrink-0"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Back */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-semibold transition-colors py-2 px-2 -ml-1 rounded-lg hover:bg-zinc-800 shrink-0"
        >
          <ArrowLeft size={15} />
          <span>Workout</span>
        </button>

        {/* Title + position */}
        <div className="flex-1 min-w-0 text-center px-1">
          <p className="text-sm font-black text-white truncate leading-tight">
            {exercise.exerciseName}
          </p>
          <p className="text-[10px] text-zinc-600 tabular-nums leading-tight mt-0.5">
            {focusedIndex + 1} / {totalCount}
          </p>
        </div>

        {/* Controls: detail + prev/next */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Progression detail"
            >
              <TrendingUp size={15} />
            </button>
          )}
          <button
            onClick={() => { if (canGoPrev) onNavigate(focusedIndex - 1); }}
            disabled={!canGoPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 disabled:text-zinc-800 hover:enabled:text-zinc-200 hover:enabled:bg-zinc-800 transition-colors"
            title="Previous exercise"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { if (canGoNext) onNavigate(focusedIndex + 1); }}
            disabled={!canGoNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 disabled:text-zinc-800 hover:enabled:text-zinc-200 hover:enabled:bg-zinc-800 transition-colors"
            title="Next exercise"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Scrollable exercise content ───────────────────────────────────── */}
      {/* touch-action: pan-y lets the browser handle vertical scroll natively.
          suppressInlineTimer=true moves the RestTimer out of the SetRow rows
          and into the sticky bottom bar, keeping one clear timer surface. */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ touchAction: "pan-y" }}
      >
        <div className="pt-2 pb-6">
          <ExerciseCardBody
            {...bodyProps}
            exercise={exercise}
            activeTimer={activeTimer}
            suppressInlineTimer={true}
          />
        </div>
      </div>

      {/* ── Sticky rest timer ─────────────────────────────────────────────── */}
      {/* Always anchored to the bottom of the overlay — visible whenever any
          timer is active, even if it belongs to a different exercise. */}
      {activeTimer !== null && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950">
          {!isTimerForThisExercise && timerExerciseName && (
            <p className="text-[10px] text-zinc-500 text-center pt-2 px-4 truncate">
              Resting · {timerExerciseName}
            </p>
          )}
          <RestTimer
            remaining={timerRemaining}
            total={activeTimer.total}
            done={timerDone}
            restedSeconds={timerDone ? activeTimer.total : 0}
            onSkip={bodyProps.onClearTimer}
            onAdjust={bodyProps.onAdjustTimer}
            onExtend={bodyProps.onExtendTimer}
          />
        </div>
      )}
    </div>
  );
}
