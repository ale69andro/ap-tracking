import type { WorkoutSession, ExerciseSet, SetType } from "@/app/types";
import { X } from "lucide-react";

type HistorySession = {
  dateMs: number;
  sets: ExerciseSet[];
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

const SET_TYPE_CONFIG: Record<SetType, { label: (n: number) => string; className: string }> = {
  "Normal":   { label: (n) => `Set ${n}`,  className: "text-zinc-500" },
  "Warm-up":  { label: ()  => "Warm-up",   className: "text-amber-500 italic" },
  "Drop Set": { label: ()  => "Drop",      className: "text-rose-400/70 italic" },
};

type Props = {
  name: string;
  history: WorkoutSession[];
  onClose: () => void;
};

export default function ExerciseHistorySheet({ name, history, onClose }: Props) {
  const sessions: HistorySession[] = history
    .filter((w) => w.exercises.some((e) => e.exerciseName === name))
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === name)!;
      const sets = ex.sets.filter((s) => s.completed);
      return { dateMs: normalizeDate(w), sets };
    })
    .filter((s) => s.sets.length > 0)
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
            <p className="text-[11px] text-zinc-500 mt-0.5">Exercise History</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Session list */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 pb-8">
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No history found.</p>
          ) : (
            sessions.map((session, i) => {
              let workingSetCount = 0;
              return (
                <div key={i}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    {formatDate(session.dateMs)}
                  </p>
                  <div className="bg-zinc-800/50 rounded-xl px-4 py-3 space-y-2">
                    {session.sets.map((set) => {
                      const cfg = SET_TYPE_CONFIG[set.type] ?? SET_TYPE_CONFIG["Normal"];
                      if (set.type === "Normal") workingSetCount += 1;
                      const label = cfg.label(workingSetCount);
                      return (
                        <div key={set.id} className="flex justify-between text-xs">
                          <span className={cfg.className}>{label}</span>
                          <span className="font-semibold text-zinc-200 tabular-nums">
                            {set.weight} kg × {set.reps} reps
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
