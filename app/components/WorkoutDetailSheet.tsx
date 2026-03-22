"use client";

import { useState } from "react";
import type { WorkoutSession } from "@/app/types";
import { getSessionDate } from "@/app/hooks/useWorkout";
import { computeWorkoutHighlight, getEffectiveSets, getCompletedSets } from "@/app/lib/workout";
import ConfirmModal from "./ConfirmModal";

type Props = {
  workout: WorkoutSession;
  onClose: () => void;
  onDelete?: () => Promise<void>;
};

function formatDuration(durationSeconds?: number): string {
  if (!durationSeconds || durationSeconds <= 0) return "";
  const mins = Math.round(durationSeconds / 60);
  return mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${mins} min`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export default function WorkoutDetailSheet({ workout, onClose, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete!();
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const date       = getSessionDate(workout);
  const duration   = formatDuration(workout.durationSeconds);
  const totalSets  = workout.exercises.reduce((n, e) => n + getEffectiveSets(e.sets).length, 0);
  const highlight  = computeWorkoutHighlight(workout);

  // Build time range string if timestamps are available
  const timeRange = (() => {
    if (!workout.startedAt) return null;
    const start = formatTime(workout.startedAt);
    if (!workout.endedAt)  return start;
    const end = formatTime(workout.endedAt);
    return duration ? `${start} – ${end} (${duration})` : `${start} – ${end}`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-black text-white truncate">{workout.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{date}</p>
              {timeRange && (
                <p className="text-xs text-zinc-600 mt-0.5 tabular-nums">{timeRange}</p>
              )}
              <p className="text-xs text-zinc-600 mt-1">
                {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}
                {" · "}
                {totalSets} set{totalSets !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-zinc-600 hover:text-red-500 text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Delete workout"
                >
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body — note: ConfirmModal renders outside this div to avoid clipping */}
        <div className="overflow-y-auto px-5 pt-4 pb-8 space-y-5">

          {/* Workout highlight */}
          {highlight && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mb-1.5">
                Workout Highlight
              </p>
              <p className="text-sm font-black text-white">{highlight.exerciseName}</p>
              <p className="text-sm text-zinc-300 mt-0.5 tabular-nums">
                {highlight.weight} kg × {highlight.reps} reps
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Est. 1RM:{" "}
                <span className="text-zinc-400 font-semibold tabular-nums">
                  {highlight.estimated1RM} kg
                </span>
              </p>
            </div>
          )}

          {/* Exercise breakdown */}
          {workout.exercises.map((exercise) => {
            const completed   = getCompletedSets(exercise.sets);
            const warmups     = completed.filter((s) => s.type === "Warm-up");
            const workingSets = completed.filter((s) => s.type !== "Warm-up");
            return (
              <div key={exercise.id}>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-sm font-bold text-zinc-100">{exercise.exerciseName}</p>
                  {exercise.muscleGroups.length > 0 && (
                    <p className="text-[11px] text-zinc-600">{exercise.muscleGroups.join(" · ")}</p>
                  )}
                </div>

                {warmups.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">Warm-up</p>
                    <div className="space-y-1">
                      {warmups.map((set) => (
                        <div key={set.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50">
                          <span className="text-[11px] font-black text-amber-600 w-5 shrink-0 text-center">W</span>
                          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                            {set.weight || "—"}
                            <span className="text-zinc-600 text-xs font-normal ml-0.5">kg</span>
                          </span>
                          <span className="text-zinc-700 text-xs">×</span>
                          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                            {set.reps || "—"}
                            <span className="text-zinc-600 text-xs font-normal ml-0.5">reps</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workingSets.length > 0 && (
                  <div>
                    {warmups.length > 0 && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">Working Sets</p>
                    )}
                    <div className="space-y-1">
                      {workingSets.map((set, i) => (
                        <div key={set.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50">
                          <span className="text-[11px] font-bold text-zinc-600 w-5 shrink-0 text-center">{i + 1}</span>
                          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                            {set.weight || "—"}
                            <span className="text-zinc-600 text-xs font-normal ml-0.5">kg</span>
                          </span>
                          <span className="text-zinc-700 text-xs">×</span>
                          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                            {set.reps || "—"}
                            <span className="text-zinc-600 text-xs font-normal ml-0.5">reps</span>
                          </span>
                          {set.type !== "Normal" && (
                            <span className="ml-auto text-[10px] font-bold text-zinc-600 uppercase tracking-wide">
                              {set.type}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete workout?"
          description="This workout will be permanently removed."
          confirmLabel="Delete workout"
          cancelLabel="Keep workout"
          loadingLabel="Deleting..."
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
