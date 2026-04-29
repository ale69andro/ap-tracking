"use client";

import { useMemo } from "react";
import type { WorkoutSession, WorkoutTemplate, ExerciseProgression, ExerciseSession, UserProfile, DailyCheckIn } from "@/app/types";
import { computeSessionScore, computeTrend } from "@/app/lib/progression";
import { getEffectiveSets } from "@/app/lib/workout";
import { getSessionDate } from "@/app/hooks/useWorkout";
import { getDefaultRepRange } from "@/app/lib/repRangeDefaults";
import { analyzeExerciseHistory } from "@/lib/analysis/analyzeExerciseHistory";
import { getTopSet } from "@/lib/analysis/exerciseMetrics";
import { buildTrainingProfile } from "@/lib/analysis/buildTrainingProfile";
import { getExerciseRecommendation } from "@/lib/analysis/getExerciseRecommendation";
import { computeMuscleGroupLoadMap } from "@/lib/analysis/smartCoach";

export function useProgression(
  history: WorkoutSession[],
  templates: WorkoutTemplate[] = [],
  profile?: UserProfile,
  dailyCheckIn?: DailyCheckIn | null,
): ExerciseProgression[] {
  return useMemo(() => {
    const trainingProfile = profile ? buildTrainingProfile(profile, dailyCheckIn) : undefined;
    // ── Build rep-range map (template-aware, most-recently-used wins) ──────────
    // Step 1: find the latest startedAt per templateId from history
    const templateLastUsed = new Map<string, number>();
    for (const session of history) {
      if (session.templateId !== undefined) {
        const current = templateLastUsed.get(session.templateId) ?? 0;
        templateLastUsed.set(session.templateId, Math.max(current, session.startedAt));
      }
    }

    // Step 2: for each template exercise with a defined range, keep the entry
    //         from the most recently used template (ties: iteration order wins)
    const repRangeMap = new Map<string, { min: number; max: number }>();
    const repRangeSource = new Map<string, number>(); // exerciseName → usedAt of winning template

    for (const template of templates) {
      const usedAt = templateLastUsed.get(template.id) ?? 0;
      for (const ex of template.exercises) {
        if (ex.targetRepsMin !== undefined && ex.targetRepsMax !== undefined) {
          const existingUsedAt = repRangeSource.get(ex.name) ?? -1;
          if (usedAt > existingUsedAt) {
            repRangeMap.set(ex.name, { min: ex.targetRepsMin, max: ex.targetRepsMax });
            repRangeSource.set(ex.name, usedAt);
          }
        }
      }
    }

    // Step 3: for any exercise name not yet in repRangeMap (user templates that
    //         predate targetRepsMin/Max, or exercises with no template at all),
    //         fall back to the default range derived from the exercise library.
    // This pass runs after the template loop so explicit template values always win.
    const allTemplateExerciseNames = new Set(
      templates.flatMap((t) => t.exercises.map((ex) => ex.name))
    );
    for (const name of allTemplateExerciseNames) {
      if (!repRangeMap.has(name)) {
        repRangeMap.set(name, getDefaultRepRange(name, profile?.experience));
      }
    }

    // ── Collect all sessions per exercise name ─────────────────────────────────
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
        const session: ExerciseSession = { date, topWeight, topReps, totalVolume, score, setCount: validSets.length };

        if (existing) {
          existing.sessions.push(session);
        } else {
          map.set(exercise.exerciseName, { muscleGroups: exercise.muscleGroups, sessions: [session] });
        }
      });
    });

    // ── Derive progression entries ─────────────────────────────────────────────
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
      const repRange       = repRangeMap.get(name);
      const analysis       = analyzeExerciseHistory(recentSessions, name, repRange);

      entries.push({
        name,
        muscleGroups,
        bestWeight,
        recentSessions,
        trend,
        trendScore: Math.round((bestWeight / globalMax) * 100),
        lastSeen,
        analysis,
        repRange,
      });
    });

    // Second pass: attach recommendation to each entry using full muscle-group context.
    // muscleGroupLoadMap requires all entries to be built first.
    const muscleGroupLoadMap = computeMuscleGroupLoadMap(entries);
    for (const entry of entries) {
      entry.recommendation = getExerciseRecommendation({
        exerciseName:       entry.name,
        sessions:           entry.recentSessions,
        repRange:           entry.repRange,
        trainingProfile,
        muscleGroups:       entry.muscleGroups,
        muscleGroupContext: muscleGroupLoadMap,
      });
    }

    return entries.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [history, templates, profile, dailyCheckIn]);
}
