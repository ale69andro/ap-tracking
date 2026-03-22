import type { ProgressionInterpretation, UserProfile, ExerciseSession, ExerciseProgression } from "@/app/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmartCoachMetrics = {
  suggestedNextWeight?: number | null;
  suggestedRepRange?: string | null;
  confidence?: "low" | "medium" | "high";
};

type VolumeContext = {
  recentVolumeLevel: "low" | "medium" | "high";
  sessionCount: number;
};

type SmartCoachInput = {
  interpretation: ProgressionInterpretation;
  profile: UserProfile;
  metrics?: SmartCoachMetrics;
  recentSessions?: ExerciseSession[];
  muscleGroups?: string[];
  muscleGroupContext?: Record<string, "low" | "medium" | "high">;
};

// ─── Muscle-group load map ────────────────────────────────────────────────────

/**
 * Computes a per-muscle-group load proxy from the full exercise progression list.
 * Load is approximated by summing recent session counts across all exercises
 * that target each muscle group. More sessions across more exercises = higher load.
 *
 * Thresholds (total recent sessions for the muscle group):
 *   ≤ 3  → "low"
 *   4–8  → "medium"
 *   ≥ 9  → "high"
 *
 * Call once per render in ProgressScreen and pass the result into getSmartRecommendation.
 */
export function computeMuscleGroupLoadMap(
  progressions: ExerciseProgression[],
): Record<string, "low" | "medium" | "high"> {
  const counts: Record<string, number> = {};
  for (const p of progressions) {
    for (const mg of p.muscleGroups) {
      counts[mg] = (counts[mg] ?? 0) + p.recentSessions.length;
    }
  }
  const map: Record<string, "low" | "medium" | "high"> = {};
  for (const [mg, count] of Object.entries(counts)) {
    map[mg] = count <= 3 ? "low" : count <= 8 ? "medium" : "high";
  }
  return map;
}

/**
 * Derives a single combined load level from all of an exercise's muscle groups.
 * Any single group being "high" elevates the combined result.
 */
function combinedMuscleLoad(
  muscleGroups: string[],
  map: Record<string, "low" | "medium" | "high">,
): "low" | "medium" | "high" {
  const levels = muscleGroups.map((mg) => map[mg] ?? "low");
  if (levels.includes("high"))   return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

// ─── Exercise-level volume context ───────────────────────────────────────────

/**
 * Derives a lightweight volume context from recent session history.
 * recentVolumeLevel compares the last session's totalVolume against
 * the historical average — not an absolute threshold, just a relative signal.
 */
function deriveVolumeContext(sessions: ExerciseSession[]): VolumeContext {
  if (sessions.length < 2) {
    return { recentVolumeLevel: "medium", sessionCount: sessions.length };
  }
  const volumes = sessions.map((s) => s.totalVolume);
  const avg  = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  const last = volumes[volumes.length - 1];

  const recentVolumeLevel: VolumeContext["recentVolumeLevel"] =
    last < avg * 0.85 ? "low" :
    last > avg * 1.15 ? "high" : "medium";

  return { recentVolumeLevel, sessionCount: sessions.length };
}

// ─── Coach ────────────────────────────────────────────────────────────────────

/**
 * Returns a personalized recommendation based on the exercise's coaching
 * interpretation, the user's profile, recent exercise volume context,
 * and muscle-group load context.
 *
 * Rules:
 * - interpretation.status is the primary signal
 * - profile (experience, goal, sleepQuality) personalizes the output
 * - recentSessions feeds a lightweight exercise-level volume context
 * - muscleGroups + muscleGroupContext feed a combined muscle-group load signal
 * - mappedStatus is NOT modified — only the recommendation text changes
 * - Falls back to interpretation.recommendation for unhandled edge cases
 */
export function getSmartRecommendation({
  interpretation,
  profile,
  metrics = {},
  recentSessions = [],
  muscleGroups = [],
  muscleGroupContext,
}: SmartCoachInput): string {
  const { status } = interpretation;
  const { experience, goal, sleepQuality } = profile;
  const { suggestedNextWeight: w, suggestedRepRange: r, confidence } = metrics;
  const { recentVolumeLevel, sessionCount } = deriveVolumeContext(recentSessions);

  // Combined muscle-group load — null when no context is available
  const mgLoad: "low" | "medium" | "high" | null =
    muscleGroups.length > 0 && muscleGroupContext
      ? combinedMuscleLoad(muscleGroups, muscleGroupContext)
      : null;

  switch (status) {

    // ── Active stall: no progress across recent sessions ──────────────────────
    case "stalling": {
      if (experience === "beginner") {
        // Beginners respond to simple linear progression — keep it concrete
        if (w != null && r != null) {
          return goal === "strength"
            ? `Add 2.5 kg next session — aim for ${r} reps at ${w} kg`
            : `Push for ${r} reps at the same weight, then consider adding a set`;
        }
        return goal === "strength"
          ? "Add 2.5 kg next session — small, consistent weight jumps compound fast"
          : "Push for one more rep first, then add a set once the rep target is hit";
      }
      // Intermediate / advanced: volume context refines the advice
      if (recentVolumeLevel === "low") {
        // If the muscle group is already loaded by other exercises, more volume here won't help
        if (mgLoad === "high") {
          return "Muscle group load is already high — change the stimulus rather than adding more sets";
        }
        return "Volume may be the limiter — try adding a set or pushing for an extra rep before changing load";
      }
      if (recentVolumeLevel === "high") {
        return experience === "advanced"
          ? "Volume is already high — a short deload may reset the stimulus before your next push"
          : "Volume is solid — try a heavier top set or change your rep range to force a new adaptation";
      }
      // Medium volume: standard structural advice
      if (goal === "strength") {
        return w != null
          ? `Wave the load over 3 sessions, then test ${w} kg — reset the stimulus`
          : "Run a short deload, then test a heavier top set — repeating the same load won't move the needle";
      }
      if (goal === "hypertrophy") {
        return "Shift to a different rep range next session or add a back-off set — a new signal is what restarts progress";
      }
      return "Vary reps, add a set, or run a short deload — something structural needs to change";
    }

    // ── Fatigue dip: recent drop after a positive trend ───────────────────────
    case "fatigue_dip": {
      if (sleepQuality === "low") {
        // Sleep is likely the driver — adjusting load won't fix the root cause
        return "Sleep is likely limiting output — hold load and focus on recovery before making any changes";
      }
      if (recentVolumeLevel === "high") {
        // Muscle-group context strengthens the fatigue signal if load is also high
        return mgLoad === "high"
          ? "Load on this muscle group is high — hold and reduce a set if the dip continues next session"
          : "Volume may be a factor — hold load and drop a set if the dip continues next session";
      }
      if (sleepQuality === "high") {
        // Recovery is fine — may be a one-off; monitor before reacting
        return "Recovery looks solid — monitor next session; if the dip continues, consider a small load reduction";
      }
      // Medium sleep, medium volume: standard hold-steady
      return "Keep the load where it is and focus on clean reps — output will come back";
    }

    // ── Regression: both latest delta and short trend are negative ────────────
    case "regressing": {
      if (experience === "beginner") {
        return "Step back 10% and rebuild with consistent reps — beginners recover fast with steady, quality work";
      }
      if (sleepQuality === "low") {
        return "Recovery is compromised — deload now and fix sleep before resuming progression";
      }
      // High exercise volume + repeated exposure: use muscle-group context to calibrate the message
      if (recentVolumeLevel === "high" && sessionCount >= 5) {
        return mgLoad === "high"
          ? "Overall stress on this muscle group looks high — reduce volume and recover before pushing load again"
          : "Recent sessions have been heavy — reduce load and volume for a session before rebuilding";
      }
      if (w != null && r != null) {
        return confidence === "high"
          ? `Deload to ${w} kg × ${r} reps — stop the decline before it compounds`
          : `Step back to ${w} kg × ${r} reps and rebuild`;
      }
      return "Pull the load back and work through a clean session — don't add weight until the reps feel solid again";
    }

    // ── Clear forward momentum ────────────────────────────────────────────────
    case "progressing": {
      if (goal === "hypertrophy" && recentVolumeLevel === "low") {
        // If muscle-group load is already high, don't recommend adding more
        if (mgLoad === "high") {
          return w != null && r != null
            ? `Keep this momentum going — target ${w} kg × ${r} reps without adding more volume yet`
            : "Momentum is good — ride the gains without adding volume until muscle group load drops";
        }
        // Low exercise volume + low/medium muscle group load: safe to add a set
        return w != null && r != null
          ? `Keep going — target ${w} kg × ${r} reps, and consider adding a back-off set`
          : "Keep going — consider adding a back-off set to build on this momentum";
      }
      if (w != null && r != null) {
        if (goal === "strength")    return `Strong signal — push to ${w} kg × ${r} reps`;
        if (goal === "hypertrophy") return `Keep volume climbing — target ${w} kg × ${r} reps, or add a back-off set`;
        return `Keep going — next: ${w} kg × ${r} reps`;
      }
      if (goal === "strength")    return "Reps are moving well — go heavier next session and keep the momentum going";
      if (goal === "hypertrophy") return "Chase reps before adding weight — stay in your rep range and add a set";
      return interpretation.recommendation;
    }

    // ── Small but real gains ──────────────────────────────────────────────────
    case "improving_slightly": {
      if (recentVolumeLevel === "low") {
        return "Volume is on the lower side — adding a set could help build on these early gains";
      }
      if (goal === "strength") {
        return w != null
          ? `Momentum is building — stay patient and aim for ${w} kg next`
          : "Momentum is building — stay consistent and keep increments small";
      }
      if (goal === "hypertrophy") {
        return "Real progress, just slow — keep volume steady and let it build";
      }
      return "Patience pays — stay consistent and keep increments small";
    }

    // ── Flat but not stuck ────────────────────────────────────────────────────
    case "stable": {
      if (goal === "strength")    return "Solid base — try a small weight jump or a heavier top set";
      if (goal === "hypertrophy") return "Solid base — push for an extra rep or add a back-off set";
      return interpretation.recommendation;
    }

    default:
      return interpretation.recommendation;
  }
}
