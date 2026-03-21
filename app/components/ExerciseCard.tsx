import type { SessionExercise, ExerciseSet, ActiveTimer } from "@/app/types";
import SetRow from "./SetRow";

type Props = {
  exercise: SessionExercise;
  activeTimer: ActiveTimer | null;
  /** Last recorded topWeight + topReps for this exercise, from history. */
  lastSession?: { topWeight: number; topReps: number };
  onDelete: () => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">, value: string) => void;
  onCompleteSet: (setId: string, restSeconds: number) => void;
  onUncompleteSet: (setId: string) => void;
  onClearTimer: () => void;
};

export default function ExerciseCard({
  exercise,
  activeTimer,
  lastSession,
  onDelete,
  onDeleteSet,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onClearTimer,
}: Props) {
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
        <button
          onClick={onDelete}
          className="ml-3 shrink-0 text-zinc-700 hover:text-red-500 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

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
            return exercise.sets.map((set, idx) => (
              <SetRow
                key={set.id}
                set={set}
                index={idx}
                isActive={idx === activeIdx}
                activeTimer={activeTimer}
                onUpdate={(field, value) => onUpdateSet(set.id, field, value)}
                onComplete={() => onCompleteSet(set.id, set.restSeconds)}
                onUncomplete={() => onUncompleteSet(set.id)}
                onDelete={() => onDeleteSet(set.id)}
                onClearTimer={onClearTimer}
              />
            ));
          })()}
        </div>
      </div>

      {/* Add Set */}
      <div className="px-3 pb-3">
        <button
          onClick={onAddSet}
          className="mt-1 w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors"
        >
          + Add Set
        </button>
      </div>
    </div>
  );
}
