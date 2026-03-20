"use client";

import { useState, useEffect, useRef } from "react";
import type {
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
  ActiveTimer,
  TemplateExercise,
} from "@/app/types";

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

export const makeExercise = (exerciseName: string, muscleGroups: string[]): SessionExercise => ({
  id: uid(),
  exerciseName,
  muscleGroups,
  sets: [defaultSet()],
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
      completed:   Boolean(s.completed),
      completedAt: s.completedAt != null ? Number(s.completedAt) : undefined,
    }));

    return {
      id:           String(ex.id ?? uid()),
      exerciseName: String(ex.exerciseName ?? ex.name ?? ""),
      muscleGroups: (ex.muscleGroups as string[]) ?? [],
      notes:        ex.notes != null ? String(ex.notes) : undefined,
      sets,
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
    date:            raw.date != null ? String(raw.date) : undefined,
    exercises,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkout() {
  // Lazy init: recover any in-progress session on first load
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("ap_active_workout");
      return stored ? migrateSession(JSON.parse(stored) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  });

  const [history, setHistory] = useState<WorkoutSession[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("ap_workouts");
      return stored
        ? (JSON.parse(stored) as Record<string, unknown>[]).map(migrateSession)
        : [];
    } catch {
      return [];
    }
  });
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);
  const [activeTimer, setActiveTimer]       = useState<ActiveTimer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist active session so it survives page reloads
  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem("ap_active_workout", JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem("ap_active_workout");
    }
  }, [activeWorkout]);

  // ── Rest Timer ──

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!activeTimer || activeTimer.remaining <= 0) {
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev || prev.remaining <= 1) {
          clearInterval(intervalRef.current!);
          return prev ? { ...prev, remaining: 0 } : null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer?.setId, activeTimer?.remaining === 0]);

  const startTimer = (setId: string, seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveTimer({ setId, remaining: Math.max(1, seconds), total: Math.max(1, seconds) });
  };

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveTimer(null);
  };

  // ── Session ──

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
        // Prefer non-warm-up sets that have a valid weight
        const working  = exercise.sets.filter((s) => s.type !== "Warm-up" && parseFloat(s.weight) > 0);
        const anyValid = exercise.sets.filter((s) => parseFloat(s.weight) > 0);
        const pool     = working.length > 0 ? working : anyValid;
        if (pool.length > 0) return pool[pool.length - 1].weight;
      }
    }
    if (templateStartWeight && parseFloat(templateStartWeight) > 0) return templateStartWeight;
    return "";
  };

  const startWorkout = (
    name = "Workout",
    templateId?: string,
    templateExercises?: TemplateExercise[],
  ) => {
    const exercises = (templateExercises ?? []).map((ex) => {
      const numSets    = ex.sets        ?? 1;
      const targetReps = ex.targetReps  != null ? String(ex.targetReps) : "";
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
        id:           uid(),
        exerciseName: ex.name,
        muscleGroups: ex.muscleGroups,
        notes:        ex.notes,
        sets,
      };
    });
    setActiveWorkout({ id: uid(), name, status: "active", templateId, startedAt: Date.now(), exercises });
  };

  const renameWorkout = (name: string) => {
    setActiveWorkout((prev) => (prev ? { ...prev, name } : prev));
  };

  // ── Exercises ──

  const addExercise = (exerciseName: string, muscleGroups: string[]) =>
    setActiveWorkout((prev) =>
      prev ? { ...prev, exercises: [...prev.exercises, makeExercise(exerciseName, muscleGroups)] } : prev
    );

  const deleteExercise = (exId: string) =>
    setActiveWorkout((prev) =>
      prev ? { ...prev, exercises: prev.exercises.filter((e) => e.id !== exId) } : prev
    );

  // ── Sets ──

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

  const completeSet = (exId: string, setId: string, restSeconds: number) => {
    const completedAt = Date.now();
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

  // ── Save / Reset ──

  const saveWorkout = () => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) return;
    clearTimer();
    const now = Date.now();
    const session: WorkoutSession = {
      ...activeWorkout,
      status:          "completed",
      endedAt:         now,
      durationSeconds: Math.round((now - activeWorkout.startedAt) / 1000),
    };
    const updated = [session, ...history];
    localStorage.setItem("ap_workouts", JSON.stringify(updated));
    setHistory(updated);
    setActiveWorkout(null);
    setCompletedSession(session);
  };

  const dismissSummary = () => setCompletedSession(null);

  const resetWorkout = () => {
    clearTimer();
    setActiveWorkout(null);
  };

  return {
    activeWorkout,
    completedSession,
    history: history.filter((s) => s.status === "completed"),
    activeTimer,
    addExercise,
    deleteExercise,
    addSet,
    deleteSet,
    updateSet,
    completeSet,
    uncompleteSet,
    saveWorkout,
    resetWorkout,
    startWorkout,
    renameWorkout,
    clearTimer,
    dismissSummary,
  };
}
