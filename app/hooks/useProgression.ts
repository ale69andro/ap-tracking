"use client";

import { useMemo } from "react";
import type { WorkoutSession, ExerciseProgression, ExerciseSession } from "@/app/types";
import { computeSessionScore, computeTrend } from "@/app/lib/progression";
import { getEffectiveSets } from "@/app/lib/workout";
import { getSessionDate } from "@/app/hooks/useWorkout";
import { analyzeExerciseHistory } from "@/lib/analysis/analyzeExerciseHistory";
import { getTopSet } from "@/lib/analysis/exerciseMetrics";

export function useProgression(history: WorkoutSession[]): ExerciseProgression[] {
  return useMemo(() => {
    // Collect all sessions per exercise name
    const map = new Map<string, { muscleGroups: string[]; sessions: ExerciseSession[] }>();

    // history is newest-first; iterate oldest-first for chronological session ordering
    [...history].reverse().forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const validSets = getEffectiveSets(exercise.sets).filter(
          (s) => s.weight !== "" && s.reps !== ""
        );
        if (validSets.length === 0) return;

        const topSet = getTopSet(validSets);
        if (!topSet) return;
        const { weight: topWeight, reps: topReps } = topSet;
        const totalVolume = validSets.reduce(
          (sum, s) => sum + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0),
          0
        );
        const score = computeSessionScore(validSets);
        const date  = getSessionDate(workout);

        const existing = map.get(exercise.exerciseName);
        const session: ExerciseSession = { date, topWeight, topReps, totalVolume, score };

        if (existing) {
          existing.sessions.push(session);
        } else {
          map.set(exercise.exerciseName, { muscleGroups: exercise.muscleGroups, sessions: [session] });
        }
      });
    });

    // Derive progression entries
    const entries: ExerciseProgression[] = [];
    const allBestWeights: number[] = [];

    map.forEach(({ sessions }) => {
      allBestWeights.push(Math.max(...sessions.map((s) => s.topWeight)));
    });

    const globalMax = Math.max(...allBestWeights, 1);

    map.forEach(({ muscleGroups, sessions }, name) => {
      const bestWeight     = Math.max(...sessions.map((s) => s.topWeight));
      const recentSessions = sessions.slice(-5);
      const lastSeen       = sessions[sessions.length - 1].date;
      const trendScores    = sessions.slice(-5).map((s) => s.score);
      const trend          = computeTrend(trendScores);
      const analysis       = analyzeExerciseHistory(recentSessions, name);

      entries.push({
        name,
        muscleGroups,
        bestWeight,
        recentSessions,
        trend,
        trendScore: Math.round((bestWeight / globalMax) * 100),
        lastSeen,
        analysis,
      });
    });

    return entries.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [history]);
}
