import { useRef, useEffect } from "react";
import type { ExerciseSet, ActiveTimer, SetType } from "@/app/types";
import RestTimer from "./RestTimer";

const SET_TYPES: SetType[] = ["Normal", "Warm-up", "Drop Set"];

const SET_TYPE_STYLES: Record<SetType, string> = {
  "Normal":   "text-zinc-500",
  "Warm-up":  "text-amber-400",
  "Drop Set": "text-red-400",
};

type Props = {
  set: ExerciseSet;
  index: number;
  isActive: boolean;
  activeTimer: ActiveTimer | null;
  onUpdate: (field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">, value: string) => void;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
  onClearTimer: () => void;
};

export default function SetRow({
  set,
  index,
  isActive,
  activeTimer,
  onUpdate,
  onComplete,
  onUncomplete,
  onDelete,
  onClearTimer,
}: Props) {
  const isTimerSet = activeTimer?.setId === set.id;
  const timerDone  = isTimerSet && activeTimer!.remaining === 0;
  const weightRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) weightRef.current?.focus();
  }, [isActive]);

  const bump = (field: "weight" | "reps", delta: number) => {
    const current = parseFloat(field === "weight" ? set.weight : set.reps) || 0;
    onUpdate(field, String(Math.max(0, +(current + delta).toFixed(2))));
  };

  return (
    <div className={`rounded-xl transition-all duration-200 ${
      set.completed
        ? ""
        : isActive
        ? "bg-red-500/[0.08] border border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.14)]"
        : "opacity-50"
    }`}>
    {set.completed ? (

      /* ── Completed: compact single line ── */
      <>
        <div className="grid grid-cols-[2rem_1fr_1fr_5rem] items-center gap-2 px-2 py-3">
          <span className="text-[11px] font-black text-emerald-700 text-center leading-none">✓</span>
          <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
            {set.weight || "—"}<span className="text-zinc-700 font-normal text-xs ml-0.5">kg</span>
          </span>
          <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
            {set.reps || "—"}<span className="text-zinc-700 font-normal text-xs ml-0.5">reps</span>
          </span>
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={onUncomplete}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs"
              title="Undo"
            >
              ↩
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-700 hover:text-red-500 hover:bg-zinc-800 transition-colors text-[10px]"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
        {isTimerSet && (
          <RestTimer
            remaining={activeTimer!.remaining}
            total={activeTimer!.total}
            done={timerDone}
            onSkip={onClearTimer}
          />
        )}
      </>

    ) : (

      /* ── Incomplete: full input row ── */
      <>
        <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] items-stretch gap-2 px-2 pt-2">

          {/* Set number */}
          <div className="flex items-center justify-center">
            <span className={`text-xs font-black tabular-nums ${SET_TYPE_STYLES[set.type]}`}>
              {set.type === "Warm-up" ? "W" : set.type === "Drop Set" ? "D" : index + 1}
            </span>
          </div>

          {/* Weight */}
          <div className="flex flex-col gap-1">
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              value={set.weight}
              onChange={(e) => onUpdate("weight", e.target.value)}
              placeholder="—"
              className={`w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-2 font-semibold text-center text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors ${isActive ? "py-3.5 text-lg" : "py-3 text-base"}`}
            />
            <div className="flex gap-1">
              {([-2.5, +2.5, +5] as const).map((d) => (
                <button key={d} type="button" onClick={() => bump("weight", d)}
                  className="flex-1 py-2.5 text-[10px] text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors tabular-nums leading-none">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>

          {/* Reps */}
          <div className="flex flex-col gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={(e) => onUpdate("reps", e.target.value)}
              placeholder="—"
              className={`w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-2 font-semibold text-center text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors ${isActive ? "py-3.5 text-lg" : "py-3 text-base"}`}
            />
            <div className="flex gap-1">
              {([-1, +1] as const).map((d) => (
                <button key={d} type="button" onClick={() => bump("reps", d)}
                  className="flex-1 py-2.5 text-[10px] text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors tabular-nums leading-none">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>

          {/* Complete — full-height primary action */}
          <button
            onClick={onComplete}
            className="h-full min-h-[44px] w-full rounded-xl bg-red-600 text-white font-black text-xl hover:bg-red-500 shadow-lg shadow-red-500/25 transition-all"
            title="Complete set"
          >
            ✓
          </button>
        </div>

        {/* Type · rest · delete */}
        <div className="flex items-center gap-2 px-2 py-2">
          <select
            value={set.type}
            onChange={(e) => onUpdate("type", e.target.value)}
            className={`text-[10px] font-bold bg-transparent border-none focus:outline-none cursor-pointer appearance-none ${SET_TYPE_STYLES[set.type]}`}
          >
            {SET_TYPES.map((t) => (
              <option key={t} value={t} className="text-zinc-100 bg-zinc-900">{t}</option>
            ))}
          </select>
          <div className="flex-1" />
          <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Rest</span>
          <input
            type="number"
            inputMode="numeric"
            value={set.restSeconds}
            onChange={(e) => onUpdate("restSeconds", e.target.value)}
            className="w-10 bg-transparent border border-zinc-800 rounded px-1 py-0.5 text-xs text-zinc-600 text-center focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <span className="text-[10px] text-zinc-700">s</span>
          <button
            onClick={onDelete}
            className="text-[10px] text-zinc-700 hover:text-red-500 transition-colors px-1 font-medium"
            title="Delete set"
          >
            ✕
          </button>
        </div>
      </>

    )}
    </div>
  );
}
