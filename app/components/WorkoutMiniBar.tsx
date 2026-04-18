"use client";

import { useEffect, useState } from "react";
import type { WorkoutSession, ActiveTimer, SessionExercise } from "../types";

type Props = {
  workout: WorkoutSession;
  activeTimer: ActiveTimer | null;
  onExpand: () => void;
};

function getTimerRemaining(timer: ActiveTimer): number {
  return Math.max(0, (timer.durationMs - (Date.now() - timer.startedAt)) / 1000);
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getCurrentExercise(workout: WorkoutSession): SessionExercise | null {
  const active = workout.exercises.find((ex) => ex.sets.some((s) => !s.completed));
  return active ?? workout.exercises[workout.exercises.length - 1] ?? null;
}

export default function WorkoutMiniBar({ workout, activeTimer, onExpand }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const currentExercise = getCurrentExercise(workout);
  const timerRemaining = activeTimer ? getTimerRemaining(activeTimer) : null;
  const isResting = timerRemaining !== null && timerRemaining > 0;

  return (
    <button
      onClick={onExpand}
      className="w-full bg-zinc-900 border-t border-zinc-800/60 px-4 py-3 flex items-center gap-3 active:bg-zinc-800/80 transition-colors"
    >
      {/* Live pulse dot */}
      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />

      {/* Workout name + current exercise */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-semibold text-zinc-500 leading-none truncate">
          {workout.name}
        </p>
        {currentExercise && (
          <p className="text-sm font-bold text-white leading-tight mt-0.5 truncate">
            {isResting ? "Resting · " : timerRemaining !== null ? "Ready · " : ""}
            {currentExercise.exerciseName}
          </p>
        )}
      </div>

      {/* Timer countdown */}
      {timerRemaining !== null && (
        <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${isResting ? "text-red-400" : "text-emerald-400"}`}>
          {isResting ? formatSeconds(timerRemaining) : "Ready"}
        </span>
      )}

      {/* Expand chevron */}
      <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
