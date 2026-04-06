"use client";

import { useState, useEffect } from "react";
import type { SessionExercise } from "@/app/types";

export function useFocusedExercise(exercises: SessionExercise[]) {
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);

  const focusedIndex = exercises.findIndex((e) => e.id === focusedExerciseId);
  const focusedExercise = focusedIndex >= 0 ? exercises[focusedIndex] : null;
  const isOpen = focusedExerciseId !== null && focusedIndex >= 0;

  // Auto-close if the focused exercise was deleted mid-workout.
  // Deferred to avoid synchronous setState-in-effect (same pattern as useWorkout).
  useEffect(() => {
    if (focusedExerciseId !== null && focusedIndex === -1) {
      Promise.resolve().then(() => setFocusedExerciseId(null));
    }
  }, [focusedExerciseId, focusedIndex]);

  const openFocused = (id: string) => setFocusedExerciseId(id);
  const closeFocused = () => setFocusedExerciseId(null);

  const goToIndex = (index: number) => {
    if (index >= 0 && index < exercises.length) {
      setFocusedExerciseId(exercises[index].id);
    }
  };

  const canGoNext = isOpen && focusedIndex < exercises.length - 1;
  const canGoPrev = isOpen && focusedIndex > 0;

  return {
    isOpen,
    focusedIndex,
    focusedExercise,
    openFocused,
    closeFocused,
    goToIndex,
    goNext: () => goToIndex(focusedIndex + 1),
    goPrev: () => goToIndex(focusedIndex - 1),
    canGoNext,
    canGoPrev,
  };
}
