"use client";

import { useState, useEffect, useRef } from "react";
import { unlockAudio, playRestChime } from "@/app/utils/restSound";
import type {
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
  ActiveTimer,
  TemplateExercise,
} from "@/app/types";
import { createClient } from "@/lib/supabase/client";
import { arrayMove } from "@dnd-kit/sortable";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID();

const defaultSet = (prev?: ExerciseSet): ExerciseSet => ({
  id:          uid(),
  weight:      prev?.weight      ?? "",
  reps:        prev?.reps        ?? "",
  type:        "Normal",
  restSeconds: prev?.restSeconds ?? 60,
  completed:   false,
});

export const makeExercise = (
  exerciseName: string,
  muscleGroups: string[],
  initialWeight = "",
  initialReps = "",
): SessionExercise => ({
  id: uid(),
  exerciseName,
  muscleGroups,
  sets: [{ id: uid(), weight: initialWeight, reps: initialReps, type: "Normal", restSeconds: 60, completed: false }],
  warmupRestSeconds: 45,
  workingRestSeconds: 90,
});

/** Format a session's display date. Uses startedAt when available, falls back to legacy date string. */
export function getSessionDate(session: WorkoutSession): string {
  if (session.startedAt > 0) {
    return new Date(session.startedAt).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }
  return session.date ?? "Unknown date";
}

// ─── Migration ────────────────────────────────────────────────────────────────

/**
 * Converts old localStorage shape to WorkoutSession.
 * Handles: exercise.name → exerciseName, set.restTime → restSeconds,
 * durationMinutes → durationSeconds, missing startedAt.
 */
function migrateSession(raw: Record<string, unknown>): WorkoutSession {
  const exercises: SessionExercise[] = (
    (raw.exercises as Record<string, unknown>[]) ?? []
  ).map((ex) => {
    const sets: ExerciseSet[] = (
      (ex.sets as Record<string, unknown>[]) ?? []
    ).map((s) => ({
      id:          String(s.id ?? uid()),
      weight:      String(s.weight ?? ""),
      reps:        String(s.reps ?? ""),
      type:        (s.type ?? "Normal") as ExerciseSet["type"],
      restSeconds: Number(s.restSeconds ?? s.restTime ?? 60),
      completed:   s.completed !== false,
      completedAt: s.completedAt != null ? Number(s.completedAt) : undefined,
    }));

    return {
      id:                  String(ex.id ?? uid()),
      exerciseName:        String(ex.exerciseName ?? ex.name ?? ""),
      muscleGroups:        (ex.muscleGroups as string[]) ?? [],
      notes:               ex.notes != null ? String(ex.notes) : undefined,
      sets,
      warmupRestSeconds:   Number(ex.warmupRestSeconds ?? 45),
      workingRestSeconds:  Number(ex.workingRestSeconds ?? 90),
    };
  });

  const durationSeconds =
    raw.durationSeconds != null ? Number(raw.durationSeconds)
    : raw.durationMinutes != null ? Number(raw.durationMinutes) * 60
    : undefined;

  return {
    id:              String(raw.id ?? uid()),
    name:            String(raw.name ?? "Workout"),
    status:          (raw.status === "active" ? "active" : "completed") as WorkoutSession["status"],
    templateId:      raw.templateId != null ? String(raw.templateId) : undefined,
    startedAt:       Number(raw.startedAt ?? 0),
    endedAt:         raw.endedAt != null ? Number(raw.endedAt) : undefined,
    durationSeconds,
    date:             raw.date != null ? String(raw.date) : undefined,
    trainingDayIndex: raw.trainingDayIndex != null ? Number(raw.trainingDayIndex) : undefined,
    exercises,
  };
}

// ─── Supabase row mappers ─────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  template_id: string | null;
  exercises: SessionExercise[];
};

function rowToSession(row: SessionRow): WorkoutSession {
  return {
    id:              row.id,
    name:            row.name,
    status:          row.status as WorkoutSession["status"],
    templateId:      row.template_id ?? undefined,
    startedAt:       row.started_at ? new Date(row.started_at).getTime() : 0,
    endedAt:         row.ended_at ? new Date(row.ended_at).getTime() : undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    exercises:       row.exercises ?? [],
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string): v is string => !!v && UUID_RE.test(v);

function sessionToRow(session: WorkoutSession, userId: string) {
  return {
    id:               session.id,
    user_id:          userId,
    name:             session.name,
    status:           session.status,
    template_id:      isUuid(session.templateId) ? session.templateId : null,
    started_at:       session.startedAt ? new Date(session.startedAt).toISOString() : null,
    ended_at:         session.endedAt ? new Date(session.endedAt).toISOString() : null,
    duration_seconds: session.durationSeconds ?? null,
    exercises:        session.exercises,
  };
}

// ─── Timer helper ────────────────────────────────────────────────────────────

/** Computes remaining seconds from timer timestamps. Always call at render time. */
export function getTimerRemaining(timer: ActiveTimer): number {
  return Math.max(0, Math.round((timer.durationMs - (Date.now() - timer.startedAt)) / 1000));
}

// ─── localStorage key for active session ────────────────────────────────────

const ACTIVE_KEY = "ap_active_workout";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkout(
  userId: string | null,
  restTimerSound = false,
  onSaveSuccess?: (workout: WorkoutSession) => void,
) {
  // Active workout: per-device in localStorage, tagged with userId for safety.
  // We load eagerly (sync) to avoid a flash, then validate userId in an effect.
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      return raw ? migrateSession(JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  });

  // Completed sessions: loaded from Supabase, starts empty until fetch resolves.
  const [history, setHistory] = useState<WorkoutSession[]>([]);

  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);
  const [activeTimer, setActiveTimer]           = useState<ActiveTimer | null>(null);
  const [, setTick]                             = useState(0);
  const intervalRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerSoundRef = useRef(restTimerSound);
  useEffect(() => { restTimerSoundRef.current = restTimerSound; }, [restTimerSound]);

  // ── Validate stored active workout against current user ──────────────────
  // If the stored workout belongs to a different account, purge it from
  // localStorage. The state reset happens via the return-value guard below.
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        // _userId is written alongside every active-workout persist (see below).
        if (parsed._userId && parsed._userId !== userId) {
          localStorage.removeItem(ACTIVE_KEY);
          // Defer state reset to avoid synchronous setState inside an effect.
          Promise.resolve().then(() => setActiveWorkout(null));
        }
      }
    } catch {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [userId]);

  // ── Load completed sessions from Supabase on mount / user change ─────────
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load sessions:", error); return; }
        setHistory((data as SessionRow[] ?? []).map(rowToSession));
      });
  }, [userId]);

  // ── Persist active session to localStorage (survives page reloads) ───────
  useEffect(() => {
    if (activeWorkout) {
      // Tag with userId so a different user on the same device can't inherit it.
      localStorage.setItem(ACTIVE_KEY, JSON.stringify({ ...activeWorkout, _userId: userId }));
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeWorkout, userId]);

  // ── Rest Timer ──────────────────────────────────────────────────────────
  //
  // activeTimer stores only the start timestamp + duration.
  // Remaining time is derived at render via getTimerRemaining().
  // The interval is a lightweight UI tick — it does NOT own the time source.

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!activeTimer) return;

    const { startedAt, durationMs } = activeTimer;

    intervalRef.current = setInterval(() => {
      const remaining = durationMs - (Date.now() - startedAt);
      setTick((t) => t + 1); // trigger re-render
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        // Notify user: short double-pulse vibration, silent fail if unsupported
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([200, 100, 200]);
        }
        if (restTimerSoundRef.current) void playRestChime();
      }
    }, 500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer]);

  const startTimer = (setId: string, seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const durationMs = Math.max(1, seconds) * 1000;
    setActiveTimer({ setId, total: Math.max(1, seconds), startedAt: Date.now(), durationMs });
  };

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveTimer(null);
  };

  const adjustTimer = (deltaSeconds: number) => {
    setActiveTimer((prev) => {
      if (!prev) return prev;
      const elapsed = Date.now() - prev.startedAt;
      const newDurationMs = Math.max(elapsed, prev.durationMs + deltaSeconds * 1000);
      return { ...prev, durationMs: newDurationMs, total: newDurationMs / 1000 };
    });
  };

  // Extends a finished (Ready) timer by a fixed number of seconds from now.
  // Uses elapsed + seconds so remaining = seconds exactly, regardless of how
  // long ago the timer reached zero. The existing interval effect restarts
  // automatically because activeTimer reference changes.
  const extendTimer = (seconds: number) => {
    setActiveTimer((prev) => {
      if (!prev) return prev;
      const elapsed = Date.now() - prev.startedAt;
      const newDurationMs = elapsed + seconds * 1000;
      return { ...prev, durationMs: newDurationMs, total: seconds };
    });
  };

  // ── Session ────────────────────────────────────────────────────────────

  /**
   * Resolves the best starting weight for a template exercise.
   *
   * Priority:
   *   1. Last weight used for this exercise in any completed session (history is newest-first,
   *      so the first match is the most recent). Prefers working sets over warm-ups.
   *   2. Template's optional startWeight suggestion.
   *   3. Empty string (user fills in from scratch).
   */
  const resolveStartWeight = (exerciseName: string, templateStartWeight?: string): string => {
    for (const session of history) {
      for (const exercise of session.exercises) {
        if (exercise.exerciseName !== exerciseName) continue;
        const working  = exercise.sets.filter((s) => s.type !== "Warm-up" && parseFloat(s.weight) > 0);
        const anyValid = exercise.sets.filter((s) => parseFloat(s.weight) > 0);
        const pool     = working.length > 0 ? working : anyValid;
        if (pool.length > 0) return pool[pool.length - 1].weight;
      }
    }
    if (templateStartWeight && parseFloat(templateStartWeight) > 0) return templateStartWeight;
    return "";
  };

  /**
   * Finds the most recent SessionExercise block to use as a pre-fill source.
   *
   * Priority:
   *   1. Most recent session with matching templateId that contains this exercise name.
   *   2. Most recent session (any templateId) that contains this exercise name.
   *   3. undefined — caller falls back to template-based construction.
   *
   * history is already sorted newest-first, so the first match is always the most recent.
   */
  const findPreviousSessionExercise = (
    exerciseName: string,
    templateId?: string,
  ): SessionExercise | undefined => {
    // Pass 1: same template
    if (templateId) {
      for (const session of history) {
        if (session.templateId !== templateId) continue;
        const ex = session.exercises.find((e) => e.exerciseName === exerciseName);
        if (ex && ex.sets.length > 0) return ex;
      }
    }
    // Pass 2: any session with this exercise name
    for (const session of history) {
      const ex = session.exercises.find((e) => e.exerciseName === exerciseName);
      if (ex && ex.sets.length > 0) return ex;
    }
    return undefined;
  };

  const startWorkout = (
    name = "Workout",
    templateId?: string,
    templateExercises?: TemplateExercise[],
    trainingDayIndex?: number,
  ) => {
    const exercises = (templateExercises ?? []).map((ex) => {
      const prev = findPreviousSessionExercise(ex.name, templateId);

      if (prev) {
        // Restore real set structure from the previous session.
        // Reset all runtime/completion state; regenerate IDs for this session.
        const sets: ExerciseSet[] = prev.sets.map((s) => ({
          id:          uid(),
          weight:      s.weight,
          reps:        s.reps,
          type:        s.type,
          restSeconds: s.restSeconds,
          completed:   false,
          // completedAt intentionally omitted
        }));
        return {
          id:                 uid(),
          exerciseName:       ex.name,
          muscleGroups:       ex.muscleGroups,
          notes:              ex.notes,
          sets,
          warmupRestSeconds:  prev.warmupRestSeconds,
          workingRestSeconds: prev.workingRestSeconds,
        };
      }

      // Fallback: template-based construction (unchanged behaviour)
      const numSets    = ex.sets       ?? 1;
      const targetReps = ex.targetReps != null ? String(ex.targetReps) : "";
      const restSecs   = ex.restSeconds ?? 60;
      const weight     = resolveStartWeight(ex.name, ex.startWeight);
      const sets: ExerciseSet[] = Array.from({ length: numSets }, () => ({
        id:          uid(),
        weight,
        reps:        targetReps,
        type:        "Normal" as const,
        restSeconds: restSecs,
        completed:   false,
      }));
      return {
        id:                 uid(),
        exerciseName:       ex.name,
        muscleGroups:       ex.muscleGroups,
        notes:              ex.notes,
        sets,
        warmupRestSeconds:  45,
        workingRestSeconds: ex.restSeconds ?? 90,
      };
    });
    setActiveWorkout({ id: uid(), name, status: "active", templateId, trainingDayIndex, startedAt: Date.now(), exercises });
  };

  const renameWorkout = (name: string) => {
    setActiveWorkout((prev) => (prev ? { ...prev, name } : prev));
  };

  // ── Exercises ────────────────────────────────────────────────────────────

  const addExercise = (exerciseName: string, muscleGroups: string[], initialWeight = "", initialReps = "") =>
    setActiveWorkout((prev) =>
      prev ? { ...prev, exercises: [...prev.exercises, makeExercise(exerciseName, muscleGroups, initialWeight, initialReps)] } : prev
    );

  const deleteExercise = (exId: string) =>
    setActiveWorkout((prev) =>
      prev ? { ...prev, exercises: prev.exercises.filter((e) => e.id !== exId) } : prev
    );

  const moveExercise = (exId: string, direction: "up" | "down") =>
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const idx = prev.exercises.findIndex((e) => e.id === exId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.exercises.length) return prev;
      const exercises = [...prev.exercises];
      [exercises[idx], exercises[swapIdx]] = [exercises[swapIdx], exercises[idx]];
      return { ...prev, exercises };
    });

  const reorderExercises = (fromIndex: number, toIndex: number) =>
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: arrayMove(prev.exercises, fromIndex, toIndex) };
    });

  // ── Sets ─────────────────────────────────────────────────────────────────

  const addSet = (exId: string) =>
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.id !== exId) return e;
          const last = e.sets[e.sets.length - 1];
          return { ...e, sets: [...e.sets, defaultSet(last)] };
        }),
      };
    });

  const deleteSet = (exId: string, setId: string) =>
    setActiveWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.map((e) =>
            e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
          )}
        : prev
    );

  const updateSet = (
    exId: string,
    setId: string,
    field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">,
    value: string,
  ) =>
    setActiveWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.map((e) =>
            e.id === exId
              ? { ...e, sets: e.sets.map((s) => s.id === setId ? { ...s, [field]: value } : s) }
              : e
          )}
        : prev
    );

  const completeSet = (exId: string, setId: string) => {
    unlockAudio(); // ensures AudioContext is running before the timer counts down
    const completedAt = Date.now();
    // Derive rest duration from exercise-level presets (closed over current snapshot).
    const exercise = activeWorkout?.exercises.find((e) => e.id === exId);
    const set      = exercise?.sets.find((s) => s.id === setId);
    const restSeconds = exercise && set
      ? (set.type === "Warm-up" ? exercise.warmupRestSeconds : exercise.workingRestSeconds)
      : 90;
    setActiveWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.map((e) =>
            e.id === exId
              ? { ...e, sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, completed: true, completedAt } : s
                )}
              : e
          )}
        : prev
    );
    startTimer(setId, restSeconds);
  };

  const uncompleteSet = (exId: string, setId: string) => {
    setActiveWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.map((e) =>
            e.id === exId
              ? { ...e, sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, completed: false, completedAt: undefined } : s
                )}
              : e
          )}
        : prev
    );
    if (activeTimer?.setId === setId) clearTimer();
  };

  const updateExerciseRest = (
    exId: string,
    field: "warmupRestSeconds" | "workingRestSeconds",
    value: number,
  ) =>
    setActiveWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.map((e) =>
            e.id === exId ? { ...e, [field]: value } : e
          )}
        : prev
    );

  // ── Save / Reset ─────────────────────────────────────────────────────────

  const saveWorkout = async (): Promise<number> => {
    if (!activeWorkout || !userId || activeWorkout.exercises.length === 0) return 0;
    clearTimer();

    let skippedSets = 0;
    const filteredExercises = activeWorkout.exercises.map((ex) => {
      const validSets = ex.sets.filter((s) => s.completed);
      skippedSets += ex.sets.length - validSets.length;
      return { ...ex, sets: validSets };
    });

    const now = Date.now();
    const session: WorkoutSession = {
      ...activeWorkout,
      exercises:       filteredExercises,
      status:          "completed",
      endedAt:         now,
      durationSeconds: Math.round((now - activeWorkout.startedAt) / 1000),
    };

    const supabase = createClient();
    const { error } = await supabase
      .from("workout_sessions")
      .insert(sessionToRow(session, userId));

    if (error) {
      console.error("Failed to save workout:", error);
      throw error;
    }

    setHistory((prev) => [session, ...prev]);
    setActiveWorkout(null);
    setCompletedSession(session);
    onSaveSuccess?.(session);
    return skippedSets;
  };

  const dismissSummary = () => setCompletedSession(null);

  const resetWorkout = () => {
    clearTimer();
    setActiveWorkout(null);
  };

  const deleteWorkout = async (workoutId: string) => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", workoutId)
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to delete workout:", error);
      throw error;
    }
    setHistory((prev) => prev.filter((w) => w.id !== workoutId));
  };

  return {
    // Gate on userId so stale state from a previous session is never exposed.
    activeWorkout:    userId ? activeWorkout : null,
    completedSession: userId ? completedSession : null,
    history:          userId ? history.filter((s) => s.status === "completed") : [],
    activeTimer,
    addExercise,
    deleteExercise,
    moveExercise,
    reorderExercises,
    addSet,
    deleteSet,
    updateSet,
    completeSet,
    uncompleteSet,
    updateExerciseRest,
    saveWorkout,
    resetWorkout,
    deleteWorkout,
    startWorkout,
    renameWorkout,
    clearTimer,
    adjustTimer,
    extendTimer,
    dismissSummary,
  };
}
