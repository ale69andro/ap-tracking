import { useState } from "react";
import type { HTMLAttributes } from "react";
import type { SessionExercise, ExerciseSet, ActiveTimer, ExerciseProgression } from "@/app/types";
import SetRow from "./SetRow";
import { getExerciseTargets } from "@/lib/analysis/getExerciseTargets";
import { CoachLabel } from "./CoachLabel";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";

type Props = {
  exercise: SessionExercise;
  activeTimer: ActiveTimer | null;
  /** Last recorded topWeight + topReps for this exercise, from history. */
  lastSession?: { topWeight: number; topReps: number };
  progression?: ExerciseProgression;
  onDelete: () => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">, value: string) => void;
  onCompleteSet: (setId: string) => void;
  onUpdateExerciseRest: (field: "warmupRestSeconds" | "workingRestSeconds", value: number) => void;
  onUncompleteSet: (setId: string) => void;
  onClearTimer: () => void;
  onAdjustTimer: (delta: number) => void;
  onExtendTimer: (seconds: number) => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
};

export default function ExerciseCard({
  exercise,
  activeTimer,
  lastSession,
  progression,
  onDelete,
  onDeleteSet,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onClearTimer,
  onAdjustTimer,
  onExtendTimer,
  onUpdateExerciseRest,
  dragHandleProps,
}: Props) {
  const [showRest, setShowRest] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden">

      {/* Exercise header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4 border-b border-zinc-800/60">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white tracking-wide truncate">{exercise.exerciseName}</h3>
          {exercise.muscleGroups.length > 0 && (
            <p className="hidden sm:block text-[11px] text-zinc-600 mt-0.5 tracking-wide">
              {exercise.muscleGroups.join(" · ")}
            </p>
          )}
          {lastSession && lastSession.topWeight > 0 && lastSession.topReps > 0 && (
            <p className="hidden sm:block text-[11px] text-zinc-700 mt-0.5 tabular-nums">
              Last · {lastSession.topWeight} kg × {lastSession.topReps}
            </p>
          )}
        </div>
        <div className="ml-3 shrink-0 flex items-center gap-1">
          <div
            {...dragHandleProps}
            style={{ touchAction: "none" }}
            className="text-zinc-600 hover:text-zinc-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors cursor-grab active:cursor-grabbing select-none"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={onDelete}
            className="text-zinc-700 hover:text-red-500 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
            title="Delete exercise"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Coach block */}
      {progression && (() => {
        const targets = getExerciseTargets(progression);
        const hasData = targets.last || targets.best || targets.target;
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
                Last · {targets.last.weight} kg × {targets.last.reps}
              </p>
            )}
            {targets.best && (targets.best.weight !== targets.last?.weight || targets.best.reps !== targets.last?.reps) && (
              <p className="text-[11px] text-zinc-500 tabular-nums">
                Best · {targets.best.weight} kg × {targets.best.reps}
              </p>
            )}
            {targets.target && (targets.target.weight != null || targets.target.repRange != null) && (
              <div className="pt-1">
                <CoachLabel />
                <p className="text-[13px] font-bold text-white tabular-nums leading-tight">
                  {targets.target.weight != null ? `${targets.target.weight} kg` : ""}
                  {targets.target.weight != null && targets.target.repRange ? " × " : ""}
                  {targets.target.repRange ?? ""}
                </p>
              </div>
            )}
          </div>
        );
      })()}

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
                  activeTimer={activeTimer}
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
    </div>
  );
}
