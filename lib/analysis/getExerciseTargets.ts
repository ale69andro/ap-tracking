import type { ExerciseProgression } from "@/app/types";

export type ExerciseTargets = {
  last: { weight: number; reps: number } | null;
  best: { weight: number; reps: number } | null;
  target: { weight?: number; repRange?: string } | null;
};

/**
 * Derives last performance, best performance, and coach target from an ExerciseProgression.
 *
 * - last:   most recent session's topWeight/topReps
 * - best:   session with highest e1RM score (strongest performance signal);
 *           falls back to highest topWeight if no meaningful score exists
 * - target: suggestedNextWeight + suggestedRepRange from analysis metrics
 */
export function getExerciseTargets(progression: ExerciseProgression): ExerciseTargets {
  const sessions = progression.recentSessions;

  if (sessions.length === 0) {
    return { last: null, best: null, target: null };
  }

  // Last = most recent session
  const lastSess = sessions[sessions.length - 1];
  const last =
    lastSess.topWeight > 0 && lastSess.topReps > 0
      ? { weight: lastSess.topWeight, reps: lastSess.topReps }
      : null;

  // Best = highest e1RM score (Epley); fallback to highest topWeight
  const hasMeaningfulScore = sessions.some((s) => s.score > 0);
  const bestSess = hasMeaningfulScore
    ? [...sessions].sort((a, b) => b.score - a.score)[0]
    : [...sessions].sort((a, b) => b.topWeight - a.topWeight)[0];
  const best =
    bestSess.topWeight > 0 && bestSess.topReps > 0
      ? { weight: bestSess.topWeight, reps: bestSess.topReps }
      : null;

  // Target = from analysis metrics
  const analysis = progression.analysis;
  const target =
    analysis?.suggestedNextWeight != null || analysis?.suggestedRepRange != null
      ? {
          weight: analysis.suggestedNextWeight ?? undefined,
          repRange: analysis.suggestedRepRange ?? undefined,
        }
      : null;

  return { last, best, target };
}

/**
 * Parses the middle rep count from a rep range string.
 * "8–10" → 9, "8-10" → 9, "8" → 8
 */
export function parseMiddleRep(repRange: string): number | null {
  const match = repRange.match(/(\d+)[–\-](\d+)/);
  if (match) return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
  const single = parseInt(repRange);
  return isNaN(single) ? null : single;
}
