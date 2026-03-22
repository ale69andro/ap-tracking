import type { TrainingDay, WorkoutTemplate } from "@/app/types";

/**
 * Returns a short, practical coach hint for the next training day card.
 *
 * Rules:
 * - Resolves the day's linked template and collects target muscle groups.
 * - Looks up each group in the muscle-group load map.
 * - If a clear majority (> 50 %) of groups share one load level → signal-based hint.
 * - If signal is mixed or unclear → neutral hint (no fake precision).
 * - If no template is linked or no load data exists → neutral hint.
 */
export function getTrainingDayHint(
  nextDay: TrainingDay | null,
  templates: WorkoutTemplate[],
  muscleLoadMap: Record<string, "low" | "medium" | "high">,
): string {
  if (!nextDay?.templateId) {
    return "Next in your sequence.";
  }

  const template = templates.find((t) => t.id === nextDay.templateId);
  if (!template || template.exercises.length === 0) {
    return "Next in your sequence.";
  }

  const groups = Array.from(
    new Set(
      template.exercises.flatMap((e) =>
        e.muscleGroups.map((g) => g.toLowerCase()),
      ),
    ),
  );

  if (groups.length === 0) {
    return "Next in your sequence.";
  }

  const knownLevels = groups
    .map((g) => muscleLoadMap[g])
    .filter((l): l is "low" | "medium" | "high" => l !== undefined);

  const label = sessionLabel(nextDay, template);

  if (knownLevels.length === 0) {
    // No load data yet — neutral, no fake signal
    return `${label} is next.`;
  }

  const dominant = getDominant(knownLevels);

  if (dominant === "low") {
    return `${label} is next — load has been light, good time to push it.`;
  }
  if (dominant === "medium") {
    return `${label} is next — recovery looks fine.`;
  }
  if (dominant === "high") {
    return `${label} load has been high recently — keep intensity controlled.`;
  }

  // Mixed signal — neutral
  return `${label} is next — dial in based on how you feel.`;
}

/** Returns the dominant load level if strictly more than half of levels match, else null. */
function getDominant(
  levels: ("low" | "medium" | "high")[],
): "low" | "medium" | "high" | null {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const l of levels) counts[l]++;
  const total = levels.length;
  for (const level of ["low", "medium", "high"] as const) {
    if (counts[level] / total > 0.5) return level;
  }
  return null;
}

/** Returns the shortest useful label for the session. */
function sessionLabel(nextDay: TrainingDay, template: WorkoutTemplate): string {
  if (nextDay.label) return nextDay.label;
  if (template.name) return template.name;
  return "This session";
}
