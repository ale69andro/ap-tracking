import type { ExerciseProgression } from "@/app/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MuscleGroupVolume = {
  group: string;
  current: number;
  previous: number;
  /** Percentage change vs previous week. 0 when previous is zero. */
  deltaPercent: number;
};

export type WeeklyVolumeResult = {
  groups: MuscleGroupVolume[];
  insight: string;
  hasData: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maps fine-grained muscle strings (from LIBRARY) to the 5 main display groups. */
export const MUSCLE_TO_MAIN: Record<string, string> = {
  Chest:         "Chest",
  "Upper Chest": "Chest",
  Back:          "Back",
  "Upper Back":  "Back",
  Lats:          "Back",
  Shoulders:     "Shoulders",
  "Front Delts": "Shoulders",
  "Side Delts":  "Shoulders",
  "Rear Delts":  "Shoulders",
  Biceps:        "Arms",
  Triceps:       "Arms",
  Forearms:      "Arms",
  Quads:         "Legs",
  Hamstrings:    "Legs",
  Calves:        "Legs",
  Adductors:     "Legs",
  Glutes:        "Legs",
};

const MAIN_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms"] as const;

// ─── Week Bounds ──────────────────────────────────────────────────────────────

/**
 * Returns inclusive start (Monday 00:00) and exclusive end (next Monday 00:00)
 * for the current week (weekOffset=0) or previous week (weekOffset=-1).
 */
function getWeekBounds(weekOffset: 0 | -1): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - daysSinceMonday + weekOffset * 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { start: monday, end: nextMonday };
}

// ─── Muscle Group Mapping ─────────────────────────────────────────────────────

/**
 * Returns the first matching main group for an exercise's muscle group list.
 * First match wins to avoid double-counting (primary muscle is typically listed first).
 */
export function toMainGroup(muscleGroups: string[]): string | null {
  for (const mg of muscleGroups) {
    const main = MUSCLE_TO_MAIN[mg];
    if (main) return main;
  }
  return null;
}

// ─── Insight Generator ────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Interprets weekly volume distribution like a coach — not a data label.
 * Priority order: missing > imbalance > drop > increase > balanced > empty.
 */
function getVolumeInsight(
  groups: MuscleGroupVolume[],
  hasCurrentData: boolean,
  hasPrevData: boolean,
): string {
  // ── 6. Empty state ────────────────────────────────────────────────────────
  if (!hasCurrentData && !hasPrevData) {
    return "Log workouts to track volume distribution.";
  }
  if (!hasCurrentData) {
    return "No sessions logged yet this week.";
  }

  // ── 1. Missing muscle group (trained last week, zero this week) ───────────
  // Only surfaces when there's meaningful prior context (previous > 0)
  if (hasPrevData) {
    // Sort by previous volume so we call out the most-trained missing group first
    const missing = groups
      .filter((g) => g.current === 0 && g.previous > 0)
      .sort((a, b) => b.previous - a.previous)[0];
    if (missing) {
      const MISSING_COPY: Record<string, string> = {
        Arms:      "No direct arm work this week — may impact progression.",
        Legs:      "Legs were not trained this week — worth addressing.",
        Back:      "No back work this week — a key movement pattern is missing.",
        Chest:     "Chest was not trained this week.",
        Shoulders: "Shoulders were not trained this week.",
      };
      return MISSING_COPY[missing.group] ?? `${missing.group} was not trained this week.`;
    }
  }

  // ── 2. Strong imbalance (one group ≥ 2× median of the active group volumes) ─
  const activeGroups = groups.filter((g) => g.current > 0);
  if (activeGroups.length >= 2) {
    const volumes = activeGroups.map((g) => g.current);
    const med = median(volumes);
    const top = [...activeGroups].sort((a, b) => b.current - a.current)[0];
    if (med > 0 && top.current >= 2 * med) {
      const IMBALANCE_COPY: Record<string, string> = {
        Legs:      "Legs dominate this week's training — other groups may be undertrained.",
        Back:      "Volume is heavily skewed toward back this week.",
        Chest:     "Chest is taking a disproportionate share of weekly volume.",
        Shoulders: "Shoulder volume is unusually high relative to the rest.",
        Arms:      "Arm volume dominates this week — balance with compound work.",
      };
      return IMBALANCE_COPY[top.group] ?? `${top.group} is dominating volume this week.`;
    }
  }

  // ── 3. Strong drop (group dropped significantly but not to zero) ──────────
  if (hasPrevData) {
    const bigDrop = groups
      .filter((g) => g.previous > 0 && g.current > 0 && g.deltaPercent < -35)
      .sort((a, b) => a.deltaPercent - b.deltaPercent)[0];
    if (bigDrop) {
      const DROP_COPY: Record<string, string> = {
        Chest:     "Chest volume dropped noticeably — watch for stalled pressing progress.",
        Back:      "Reduced back volume this week — pulling strength may lag.",
        Legs:      "Leg volume dropped sharply — consider a recovery or makeup session.",
        Shoulders: "Shoulder volume is down compared to last week.",
        Arms:      "Less arm work than last week — fine if compounds are covering it.",
      };
      return DROP_COPY[bigDrop.group] ?? `${bigDrop.group} volume dropped — monitor progression.`;
    }
  }

  // ── 4. Strong increase (group spiked significantly) ───────────────────────
  if (hasPrevData) {
    const bigRise = groups
      .filter((g) => g.previous > 0 && g.deltaPercent > 50)
      .sort((a, b) => b.deltaPercent - a.deltaPercent)[0];
    if (bigRise) {
      const RISE_COPY: Record<string, string> = {
        Legs:      "Leg volume increased sharply — monitor fatigue and soreness.",
        Back:      "Back workload is much higher than last week — pace recovery.",
        Chest:     "Chest volume spiked this week — give it room to recover.",
        Shoulders: "High shoulder volume this week — watch for joint fatigue.",
        Arms:      "Arm volume jumped — ensure you're not overloading small muscles.",
      };
      return RISE_COPY[bigRise.group] ?? `${bigRise.group} workload is much higher than last week.`;
    }
  }

  // ── 5. Balanced distribution ──────────────────────────────────────────────
  if (activeGroups.length >= 3) {
    return "Volume is well balanced across muscle groups this week.";
  }

  // Minimal data — not enough to say much
  if (activeGroups.length === 1) {
    return `Only ${activeGroups[0].group} trained so far — more variety ahead?`;
  }

  return "Training distribution looks consistent this week.";
}

// ─── Preview Text ─────────────────────────────────────────────────────────────

/**
 * Returns a short (≤50 char) summary sentence for the VolumePreviewCard.
 * Follows the same priority order as getVolumeInsight but produces terse output.
 */
export function getVolumePreviewText(data: WeeklyVolumeResult): string {
  if (!data.hasData) return "No volume data yet";

  const activeNow = data.groups.filter((g) => g.current > 0);
  if (activeNow.length === 0) return "No sessions logged this week";

  // Missing muscle (trained last week, absent this week)
  const missing = data.groups
    .filter((g) => g.current === 0 && g.previous > 0)
    .sort((a, b) => b.previous - a.previous)[0];
  if (missing) return `${missing.group} not trained yet this week`;

  // Strong imbalance — one group clearly dominates by volume
  if (activeNow.length >= 2) {
    const sorted = [...activeNow].sort((a, b) => b.current - a.current);
    const top    = sorted[0];
    const second = sorted[1];
    if (top.current >= 2 * second.current) {
      return `${top.group} dominating volume this week`;
    }
  }

  // Both spike and drop vs last week
  const spiked  = data.groups.filter((g) => g.previous > 0 && g.deltaPercent > 50);
  const dropped = data.groups.filter(
    (g) => g.current > 0 && g.previous > 0 && g.deltaPercent < -35,
  );
  if (spiked.length > 0 && dropped.length > 0) {
    return `${spiked[0].group} up · ${dropped[0].group} down vs last week`;
  }
  if (spiked.length > 0) return `${spiked[0].group} volume spiked this week`;
  if (dropped.length > 0) return `${dropped[0].group} volume dropped this week`;

  if (activeNow.length >= 3) return "Volume balanced this week";
  if (activeNow.length === 1) return `Only ${activeNow[0].group} trained so far`;
  return "Volume on track";
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Aggregates weekly volume by muscle group from exercise progression data.
 * Uses ISO-style week boundaries (Mon–Sun) for current and previous week.
 * Volume is attributed to the first matched main group of each exercise.
 */
export function getWeeklyVolumeByMuscleGroup(
  progressions: ExerciseProgression[],
): WeeklyVolumeResult {
  const currBounds = getWeekBounds(0);
  const prevBounds = getWeekBounds(-1);

  const currVol: Record<string, number> = Object.fromEntries(MAIN_GROUPS.map((g) => [g, 0]));
  const prevVol: Record<string, number> = Object.fromEntries(MAIN_GROUPS.map((g) => [g, 0]));

  for (const p of progressions) {
    const mainGroup = toMainGroup(p.muscleGroups);
    if (!mainGroup) continue;

    for (const session of p.recentSessions) {
      const date = new Date(session.date);
      if (date >= currBounds.start && date < currBounds.end) {
        currVol[mainGroup] += session.totalVolume;
      } else if (date >= prevBounds.start && date < prevBounds.end) {
        prevVol[mainGroup] += session.totalVolume;
      }
    }
  }

  const hasCurrentData = MAIN_GROUPS.some((g) => currVol[g] > 0);
  const hasPrevData = MAIN_GROUPS.some((g) => prevVol[g] > 0);
  const hasData = hasCurrentData || hasPrevData;

  const groups: MuscleGroupVolume[] = MAIN_GROUPS.map((group) => {
    const current = currVol[group];
    const previous = prevVol[group];
    const deltaPercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { group, current, previous, deltaPercent };
  });

  // Sort by current volume descending — active groups first
  groups.sort((a, b) => b.current - a.current || b.previous - a.previous);

  const insight = getVolumeInsight(groups, hasCurrentData, hasPrevData);
  return { groups, insight, hasData };
}
