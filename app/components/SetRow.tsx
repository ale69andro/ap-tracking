import { useRef, useEffect, useState, useCallback } from "react";
import type { ExerciseSet, ActiveTimer, SetType } from "@/app/types";
import { getTimerRemaining } from "@/app/hooks/useWorkout";
import RestTimer from "./RestTimer";
import NumberPickerSheet from "./NumberPickerSheet";
import { Undo2, Trash2 } from "lucide-react";

const SET_TYPES: SetType[] = ["Normal", "Warm-up", "Drop Set"];

const SET_TYPE_STYLES: Record<SetType, string> = {
  "Normal":   "text-zinc-500",
  "Warm-up":  "text-amber-500",
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
  onAdjustTimer: (delta: number) => void;
  onExtendTimer: (seconds: number) => void;
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
  onAdjustTimer,
  onExtendTimer,
}: Props) {
  const isTimerSet     = activeTimer?.setId === set.id;
  const timerRemaining = isTimerSet ? getTimerRemaining(activeTimer!) : 0;
  const timerDone      = isTimerSet && timerRemaining === 0;
  const weightRef      = useRef<HTMLInputElement>(null);
  const prevIsActiveRef = useRef(isActive);
  const [showControls, setShowControls] = useState(false);

  // ── Number picker state ────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState<"weight" | "reps" | null>(null);

  // ── Trash confirm state ─────────────────────────────────────────────────────
  const [armed, setArmed] = useState(false);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrashTap = useCallback(() => {
    if (armed) {
      clearTimeout(armTimerRef.current!);
      armTimerRef.current = null;
      setArmed(false);
      if (isTimerSet) onClearTimer();
      onDelete();
    } else {
      setArmed(true);
      armTimerRef.current = setTimeout(() => setArmed(false), 2500);
    }
  }, [armed, isTimerSet, onClearTimer, onDelete]);

  useEffect(() => {
    return () => { if (armTimerRef.current) clearTimeout(armTimerRef.current); };
  }, []);

  // ── Swipe-to-delete ────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 70;
  const SWIPE_MAX       = 96;
  const [swipeX, setSwipeX]   = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeState = useRef({ startX: 0, startY: 0, dirLocked: false, horizontal: false });

  const resetSwipe = useCallback(() => {
    setSwipeX(0);
    setSwiping(false);
    swipeState.current = { startX: 0, startY: 0, dirLocked: false, horizontal: false };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) return;
    swipeState.current = { startX: e.clientX, startY: e.clientY, dirLocked: false, horizontal: false };
    setSwiping(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const s = swipeState.current;
    if (!swiping) return;
    const dx = s.startX - e.clientX;
    const dy = Math.abs(e.clientY - s.startY);
    if (!s.dirLocked) {
      if (Math.abs(dx) < 4 && dy < 4) return;
      s.horizontal = Math.abs(dx) > dy;
      s.dirLocked  = true;
    }
    if (!s.horizontal) { resetSwipe(); return; }
    e.preventDefault();
    setSwipeX(Math.max(0, Math.min(SWIPE_MAX, dx)));
  }, [swiping, resetSwipe]);

  const handlePointerUp = useCallback(() => {
    if (!swiping) return;
    if (swipeX >= SWIPE_THRESHOLD) {
      if (isTimerSet) onClearTimer();
      onDelete();
    } else {
      resetSwipe();
    }
  }, [swiping, swipeX, isTimerSet, onClearTimer, onDelete, resetSwipe]);

  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) weightRef.current?.focus();
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  const bump = (field: "weight" | "reps", delta: number) => {
    const current = parseFloat(field === "weight" ? set.weight : set.reps) || 0;
    onUpdate(field, String(Math.max(0, +(current + delta).toFixed(2))));
  };

  return (
    <>
      <div className={`rounded-xl transition-all duration-200 relative overflow-hidden ${
        set.completed
          ? ""
          : isActive
          ? "bg-red-500/[0.08] border border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.14)]"
          : "opacity-50"
      }`}>

        {/* Delete background — only mounted during a swipe so nothing bleeds through at rest */}
        {swipeX > 0 && (
          <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500/20 rounded-xl">
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Delete</span>
          </div>
        )}

        {/* Swipeable content — wraps both completed and incomplete rows */}
        <div
          style={{ transform: `translateX(-${swipeX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetSwipe}
        >
          {set.completed ? (

            /* ── Completed: compact single line ── */
            <div className="grid grid-cols-[2rem_1fr_1fr_5rem] items-center gap-2 px-2 py-3">
              <span className={`text-[11px] font-black text-center leading-none ${set.type === "Warm-up" ? "text-amber-500" : "text-emerald-700"}`}>
                {set.type === "Warm-up" ? "W" : "✓"}
              </span>
              <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
                {set.weight || "—"}<span className="text-zinc-700 font-normal text-xs ml-0.5">kg</span>
              </span>
              <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
                {set.reps || "—"}<span className="text-zinc-700 font-normal text-xs ml-0.5">reps</span>
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={onUncomplete}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  onClick={handleTrashTap}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 ${
                    armed
                      ? "text-red-500 bg-red-500/15 ring-1 ring-red-500/40 scale-110"
                      : "text-zinc-700 hover:text-red-500 hover:bg-zinc-800"
                  }`}
                  title={armed ? "Tap again to confirm" : "Delete"}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

          ) : (

            /* ── Incomplete: full input row ── */
            <>
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem_3.5rem] items-stretch gap-2 px-2 pt-2">

                {/* Set number — tap to reveal secondary controls */}
                <button
                  type="button"
                  onClick={() => setShowControls((v) => !v)}
                  className={`flex items-center justify-center w-full h-full rounded-lg transition-colors ${showControls ? "bg-zinc-800" : "bg-zinc-800/50 hover:bg-zinc-700/60"}`}
                  title={showControls ? "Hide options" : "Set options"}
                >
                  <span className={`text-xs font-black tabular-nums ${SET_TYPE_STYLES[set.type]}`}>
                    {set.type === "Warm-up" ? "W" : set.type === "Drop Set" ? "D" : index + 1}
                  </span>
                </button>

                {/* Weight */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setPickerOpen("weight")}
                    className={`w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-2 font-semibold text-center text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors cursor-pointer hover:border-red-500/50 active:bg-zinc-700 ${isActive ? "py-3.5 text-lg" : "py-3.5 text-base"}`}
                  >
                    {set.weight || "—"}
                  </button>
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
                  <button
                    type="button"
                    onClick={() => setPickerOpen("reps")}
                    className={`w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-2 font-semibold text-center text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors cursor-pointer hover:border-red-500/50 active:bg-zinc-700 ${isActive ? "py-3.5 text-lg" : "py-3.5 text-base"}`}
                  >
                    {set.reps || "—"}
                  </button>
                  <div className="flex gap-1">
                    {([-1, +1] as const).map((d) => (
                      <button key={d} type="button" onClick={() => bump("reps", d)}
                        className="flex-1 py-2.5 text-[10px] text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors tabular-nums leading-none">
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete — always visible, confirm on first tap */}
                <button
                  onClick={handleTrashTap}
                  className={`h-full min-h-[44px] w-full flex items-center justify-center rounded-lg transition-all duration-150 ${
                    armed
                      ? "text-red-500 bg-red-500/15 ring-1 ring-red-500/40 scale-110"
                      : "text-zinc-600 hover:text-red-500 hover:bg-zinc-800/60"
                  }`}
                  title={armed ? "Tap again to confirm" : "Delete set"}
                >
                  <Trash2 size={14} />
                </button>

                {/* Complete — full-height primary action */}
                <button
                  onClick={onComplete}
                  className="h-full min-h-[44px] w-full rounded-xl bg-red-600 text-white font-black text-xl hover:bg-red-500 shadow-lg shadow-red-500/25 transition-all"
                  title="Complete set"
                >
                  ✓
                </button>
              </div>

              {/* Type — revealed by tapping the set number */}
              {showControls && (
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
                </div>
              )}
            </>

          )}
        </div>
      </div>

      {/* RestTimer lives outside overflow-hidden so it expands vertically without being clipped */}
      {isTimerSet && (
        <RestTimer
          remaining={timerRemaining}
          total={activeTimer!.total}
          done={timerDone}
          restedSeconds={timerDone ? activeTimer!.total : 0}
          onSkip={onClearTimer}
          onAdjust={onAdjustTimer}
          onExtend={onExtendTimer}
        />
      )}

      {/* Number Picker Sheets */}
      <NumberPickerSheet
        isOpen={pickerOpen === "weight"}
        title="Weight"
        currentValue={parseFloat(set.weight) || 0}
        minValue={0}
        maxValue={300}
        increment={0.5}
        onChange={(value) => onUpdate("weight", String(value))}
        onClose={() => setPickerOpen(null)}
      />
      <NumberPickerSheet
        isOpen={pickerOpen === "reps"}
        title="Reps"
        currentValue={parseFloat(set.reps) || 1}
        minValue={1}
        maxValue={30}
        increment={1}
        onChange={(value) => onUpdate("reps", String(Math.round(value)))}
        onClose={() => setPickerOpen(null)}
      />
    </>
  );
}
