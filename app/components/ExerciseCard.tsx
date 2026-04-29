import { useState } from "react";
import { createPortal } from "react-dom";
import type { HTMLAttributes } from "react";
import type { SessionExercise, ExerciseSet, ActiveTimer, ExerciseProgression, WorkoutSuggestion, ExercisePrescription } from "@/app/types";
import ConfirmModal from "./ConfirmModal";
import SetRow from "./SetRow";
import { getExerciseTargets } from "@/lib/analysis/getExerciseTargets";
import { ACTION_LABEL } from "@/app/lib/coachLabels";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus, Maximize2 } from "lucide-react";

// ─── ExerciseCardBody ─────────────────────────────────────────────────────────
// Shared between ExerciseCard (workout list) and FocusedExerciseOverlay.
// Contains coach block, set rows, suggestion, add-set, and rest presets.
// Does NOT include the card header (exercise name, drag handle, delete).

export type ExerciseCardBodyProps = {
  exercise: SessionExercise;
  activeTimer: ActiveTimer | null;
  progression?: ExerciseProgression;
  suggestion?: WorkoutSuggestion;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">, value: string) => void;
  onCompleteSet: (setId: string) => void;
  onUncompleteSet: (setId: string) => void;
  onClearTimer: () => void;
  onAdjustTimer: (delta: number) => void;
  onExtendTimer: (seconds: number) => void;
  onUpdateExerciseRest: (field: "warmupRestSeconds" | "workingRestSeconds", value: number) => void;
  /** When true (focused overlay), the inline RestTimer inside SetRow is suppressed.
   *  The overlay renders its own sticky bottom timer instead. */
  suppressInlineTimer?: boolean;
  /** Active unconsumed prescription for this exercise — used to mark coach-influenced sets. */
  activePrescription?: ExercisePrescription;
};

export function ExerciseCardBody({
  exercise,
  activeTimer,
  progression,
  suggestion,
  onDeleteSet,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onClearTimer,
  onAdjustTimer,
  onExtendTimer,
  onUpdateExerciseRest,
  suppressInlineTimer = false,
  activePrescription,
}: ExerciseCardBodyProps) {
  const [showRest, setShowRest] = useState(false);
  const timerForRow = suppressInlineTimer ? null : activeTimer;

  // Per-set coach influence: true only when a prescription is active AND the
  // set's values deviate from the last-session baseline (what they'd have been
  // without the prescription). Falls back to "prescription present" when no
  // session history exists to compare against.
  const lastSession = progression?.recentSessions?.at(-1) ?? null;
  const isSetCoachInfluenced = (set: ExerciseSet): boolean => {
    if (set.type === "Warm-up" || !activePrescription) return false;
    if (lastSession && lastSession.topWeight > 0 && lastSession.topReps > 0) {
      const w = parseFloat(set.weight);
      const r = parseFloat(set.reps);
      const weightDiffers = !isNaN(w) && Math.abs(w - lastSession.topWeight) > 0.001;
      const repsDiffer    = !isNaN(r) && Math.abs(r - lastSession.topReps)   > 0.001;
      return weightDiffers || repsDiffer;
    }
    return true; // no baseline — prescription present, assume influenced
  };
  const anyCoachInfluenced = exercise.sets.some(isSetCoachInfluenced);

  return (
    <>
      {/* Coach block */}
      {progression && (() => {
        const targets = getExerciseTargets(progression);
        // Pre-computed by useProgression with TrainingProfile and muscle-group context.
        const recommendation = progression.recommendation;
        const hasData = targets.last || targets.best || (recommendation !== undefined && recommendation.action !== "new");
        if (!hasData) {
          return (
            <div className="px-4 py-2 border-b border-zinc-800/40">
              <p className="text-[11px] text-zinc-600 italic">First session — start moderate and build up</p>
            </div>
          );
        }
        return (
          <div className="px-4 py-2 border-b border-zinc-800/40 space-y-0.5">
            {targets.last && (
              <p className="text-[11px] text-zinc-500 tabular-nums">
                Last session · {targets.last.weight} kg × {targets.last.reps}
              </p>
            )}
            {targets.best && (targets.best.weight !== targets.last?.weight || targets.best.reps !== targets.last?.reps) && (
              <p className="text-[11px] text-zinc-500 tabular-nums">
                Best · {targets.best.weight} kg × {targets.best.reps}
              </p>
            )}
            {recommendation && recommendation.action !== "new" && recommendation.confidence !== "low" && recommendation.targetWeight !== null && (
              <div className="pt-1">
                <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-0.5">
                  {ACTION_LABEL[recommendation.action] ?? "Target today"}
                </p>
                <p className="text-[13px] font-bold text-white tabular-nums leading-tight">
                  {recommendation.targetWeight} kg × {
                    recommendation.targetRepsMin === recommendation.targetRepsMax
                      ? recommendation.targetRepsMin
                      : `${recommendation.targetRepsMin}–${recommendation.targetRepsMax}`
                  }
                </p>
                {recommendation.setAction === "reduce_set" && recommendation.targetSets !== undefined && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">Drop to {recommendation.targetSets} sets</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Coach prescription hint — shown once per exercise when any set is coach-influenced */}
      {anyCoachInfluenced && (
        <div className="px-4 py-1.5 border-b border-zinc-800/40">
          <p className="text-[10px] text-amber-600/80 font-medium tracking-wide">
            ⚡ Load adjusted based on your progression
          </p>
        </div>
      )}

      {/* Sets */}
      <div className="px-3 pt-3 pb-1">
        {/* Column labels */}
        <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-[10px] text-zinc-500 font-medium uppercase tracking-widest px-2 mb-1">
          <span></span>
          <span>kg</span>
          <span>Reps</span>
          <span></span>
        </div>

        <div className="space-y-2">
          {(() => {
            const activeIdx = exercise.sets.findIndex((s) => !s.completed);
            let workingIdx = 0;
            return exercise.sets.map((set, idx) => {
              const displayIndex = set.type !== "Warm-up" ? workingIdx++ : -1;
              return (
                <SetRow
                  key={set.id}
                  set={set}
                  index={displayIndex}
                  isActive={idx === activeIdx}
                  activeTimer={timerForRow}
                  isCoachInfluenced={isSetCoachInfluenced(set)}
                  onUpdate={(field, value) => onUpdateSet(set.id, field, value)}
                  onComplete={() => onCompleteSet(set.id)}
                  onUncomplete={() => onUncompleteSet(set.id)}
                  onDelete={() => onDeleteSet(set.id)}
                  onClearTimer={onClearTimer}
                  onAdjustTimer={onAdjustTimer}
                  onExtendTimer={onExtendTimer}
                />
              );
            });
          })()}
        </div>
      </div>

      {/* Inline coaching suggestion */}
      {suggestion && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mb-0.5">
            ⚡ Suggestion
          </p>
          <p className="text-[13px] text-white font-bold">{suggestion.title}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{suggestion.detail}</p>
        </div>
      )}

      {/* Add Set */}
      <div className="px-3 pb-1">
        <button
          onClick={onAddSet}
          className="mt-1 w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors"
        >
          <span className="inline-flex items-center gap-1"><Plus size={12} /> Add Set</span>
        </button>
      </div>

      {/* Rest presets — collapsed by default */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setShowRest((v) => !v)}
          className="w-full py-1 text-[10px] text-zinc-700 hover:text-zinc-500 uppercase tracking-widest font-semibold transition-colors"
        >
          <span className="inline-flex items-center gap-1">Rest {showRest ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
        </button>
        {showRest && (
          <div className="space-y-1.5 pt-1">
            {(
              [
                { label: "Warm-up", field: "warmupRestSeconds", presets: [30, 45, 60, 90], current: exercise.warmupRestSeconds },
                { label: "Working", field: "workingRestSeconds", presets: [60, 90, 120, 180], current: exercise.workingRestSeconds },
              ] as const
            ).map(({ label, field, presets, current }) => (
              <div key={field} className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-600 w-14 shrink-0">{label}</span>
                {presets.map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateExerciseRest(field, s)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                      current === s
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────
// Full card used in the workout list. Adds the header (name, drag, delete)
// around the shared ExerciseCardBody.

type Props = ExerciseCardBodyProps & {
  onDelete: () => void;
  onOpenHistory?: () => void;
  onOpenFocusMode?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
};

export default function ExerciseCard({
  exercise,
  activeTimer,
  progression,
  onDelete,
  onDeleteSet,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  suggestion,
  onUncompleteSet,
  onClearTimer,
  onAdjustTimer,
  onExtendTimer,
  onUpdateExerciseRest,
  onOpenHistory,
  onOpenFocusMode,
  dragHandleProps,
  activePrescription,
}: Props) {
  const [deleteExerciseOpen, setDeleteExerciseOpen] = useState(false);

  return (
    <>
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden">

      {/* Exercise header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4 border-b border-zinc-800/60">
        <div className="min-w-0 flex-1">
          {onOpenHistory ? (
            <button
              onClick={onOpenHistory}
              className="text-left w-full hover:text-red-500 transition-colors active:opacity-70"
              title="View exercise history"
            >
              <h3 className="text-sm font-bold text-white tracking-wide truncate">{exercise.exerciseName}</h3>
              {exercise.muscleGroups.length > 0 && (
                <p className="hidden sm:block text-[11px] text-zinc-600 mt-0.5 tracking-wide">
                  {exercise.muscleGroups.join(" · ")}
                </p>
              )}
            </button>
          ) : (
            <>
              <h3 className="text-sm font-bold text-white tracking-wide truncate">{exercise.exerciseName}</h3>
              {exercise.muscleGroups.length > 0 && (
                <p className="hidden sm:block text-[11px] text-zinc-600 mt-0.5 tracking-wide">
                  {exercise.muscleGroups.join(" · ")}
                </p>
              )}
            </>
          )}
        </div>
        <div className="ml-3 shrink-0 flex items-center gap-1">
          {onOpenFocusMode && (
            <button
              onClick={onOpenFocusMode}
              className="text-zinc-600 hover:text-red-500 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
              title="Focus mode"
            >
              <Maximize2 size={16} />
            </button>
          )}
          <div
            {...dragHandleProps}
            style={{ touchAction: "none" }}
            className="text-zinc-600 hover:text-zinc-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors cursor-grab active:cursor-grabbing select-none"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={() => setDeleteExerciseOpen(true)}
            className="text-zinc-700 hover:text-red-500 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
            title="Delete exercise"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <ExerciseCardBody
        exercise={exercise}
        activeTimer={activeTimer}
        progression={progression}
        suggestion={suggestion}
        activePrescription={activePrescription}
        onDeleteSet={onDeleteSet}
        onAddSet={onAddSet}
        onUpdateSet={onUpdateSet}
        onCompleteSet={onCompleteSet}
        onUncompleteSet={onUncompleteSet}
        onClearTimer={onClearTimer}
        onAdjustTimer={onAdjustTimer}
        onExtendTimer={onExtendTimer}
        onUpdateExerciseRest={onUpdateExerciseRest}
      />
    </div>
    {deleteExerciseOpen && typeof document !== "undefined" && createPortal(
      <ConfirmModal
        title="Delete exercise?"
        description="All sets in this exercise will be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => { setDeleteExerciseOpen(false); onDelete(); }}
        onCancel={() => setDeleteExerciseOpen(false)}
      />,
      document.body
    )}
    </>
  );
}
