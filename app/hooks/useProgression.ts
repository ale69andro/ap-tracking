"use client";

import { useMemo } from "react";
import type { WorkoutSession, WorkoutTemplate, ExerciseProgression, UserProfile, DailyCheckIn } from "@/app/types";
import { buildExerciseProgressions } from "@/lib/analysis/buildExerciseProgressions";

export function useProgression(
  history: WorkoutSession[],
  templates: WorkoutTemplate[] = [],
  profile?: UserProfile,
  dailyCheckIn?: DailyCheckIn | null,
): ExerciseProgression[] {
  return useMemo(
    () => buildExerciseProgressions(history, templates, profile, dailyCheckIn),
    [history, templates, profile, dailyCheckIn],
  );
}
