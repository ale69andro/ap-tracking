import type { WorkoutSession, ExerciseSet } from "@/app/types";
import { X } from "lucide-react";

type HistorySession = {
  dateMs: number;
  workoutName: string;
  warmups: ExerciseSet[];
  workingSets: ExerciseSet[];
  dropSets: ExerciseSet[];
};

function normalizeDate(session: WorkoutSession): number {
  if (typeof session.startedAt === "number" && session.startedAt > 0) {
    return session.startedAt;
  }
  if (session.date) {
    const parsed = Date.parse(session.date);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

function formatDate(ms: number): string {
  if (ms === 0) return "Unknown date";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  name: string;
  muscleGroups: string[];
  history: WorkoutSession[];
  onClose: () => void;
};

export default function ExerciseHistorySheet({ name, muscleGroups, history, onClose }: Props) {
  const sessions: HistorySession[] = history
    .filter((w) => w.exercises.some((e) => e.exerciseName === name))
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === name)!;
      const completed = ex.sets.filter((s) => s.completed);
      return {
        dateMs:      normalizeDate(w),
        workoutName: w.name || "Workout",
        warmups:     completed.filter((s) => s.type === "Warm-up"),
        workingSets: completed.filter((s) => s.type === "Normal"),
        dropSets:    completed.filter((s) => s.type === "Drop Set"),
      };
    })
    .filter((s) => s.warmups.length + s.workingSets.length + s.dropSets.length > 0)
    .sort((a, b) => b.dateMs - a.dateMs);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">{name}</h2>
            {muscleGroups.length > 0 ? (
              <p className="text-[11px] text-zinc-500 mt-0.5">{muscleGroups.join(" · ")}</p>
            ) : (
              <p className="text-[11px] text-zinc-500 mt-0.5">Exercise History</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Session list */}
        <div className="overflow-y-auto px-5 py-4 space-y-6 pb-8">
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No history found.</p>
          ) : (
            sessions.map((session, i) => (
              <div key={i}>
                {/* Session date + workout name */}
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                  {formatDate(session.dateMs)}
                  <span className="font-normal normal-case tracking-normal text-zinc-600"> · {session.workoutName}</span>
                </p>

                <div className="space-y-3">
                  {/* Warm-up section */}
                  {session.warmups.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">Warm-up</p>
                      <div className="space-y-1">
                        {session.warmups.map((set) => (
                          <div key={set.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50">
                            <span className="text-[11px] font-black text-amber-500 w-5 shrink-0 text-center">W</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.weight || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">kg</span>
                            </span>
                            <span className="text-zinc-700 text-xs">×</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.reps || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">reps</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Working sets section */}
                  {session.workingSets.length > 0 && (
                    <div>
                      {session.warmups.length > 0 && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">Working Sets</p>
                      )}
                      <div className="space-y-1">
                        {session.workingSets.map((set, j) => (
                          <div key={set.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50">
                            <span className="text-[11px] font-bold text-zinc-600 w-5 shrink-0 text-center">{j + 1}</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.weight || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">kg</span>
                            </span>
                            <span className="text-zinc-700 text-xs">×</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.reps || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">reps</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop sets section */}
                  {session.dropSets.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">Drop Sets</p>
                      <div className="space-y-1">
                        {session.dropSets.map((set) => (
                          <div key={set.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50">
                            <span className="text-[11px] font-black text-rose-400 w-5 shrink-0 text-center">D</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.weight || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">kg</span>
                            </span>
                            <span className="text-zinc-700 text-xs">×</span>
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                              {set.reps || "—"}<span className="text-zinc-600 text-xs font-normal ml-0.5">reps</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
