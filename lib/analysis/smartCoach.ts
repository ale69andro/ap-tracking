import type { ProgressionInterpretation, UserProfile, ExerciseSession } from "@/app/types";

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
};

// ─── Volume context ───────────────────────────────────────────────────────────

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
 * interpretation, the user's profile, and recent volume context.
 *
 * Rules:
 * - interpretation.status is the primary signal
 * - profile (experience, goal, sleepQuality) personalizes the output
 * - recentSessions feeds a lightweight volume context (relative, not absolute)
 * - mappedStatus is NOT modified — only the recommendation text changes
 * - Falls back to interpretation.recommendation for unhandled edge cases
 */
export function getSmartRecommendation({
  interpretation,
  profile,
  metrics = {},
  recentSessions = [],
}: SmartCoachInput): string {
  const { status } = interpretation;
  const { experience, goal, sleepQuality } = profile;
  const { suggestedNextWeight: w, suggestedRepRange: r, confidence } = metrics;
  const { recentVolumeLevel, sessionCount } = deriveVolumeContext(recentSessions);

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
        return "Volume may be the limiter — try adding a set or pushing for an extra rep before changing load";
      }
      if (recentVolumeLevel === "high") {
        return experience === "advanced"
          ? "Volume is already high — a short deload may reset the stimulus before your next push"
          : "Volume is solid — vary your rep range or shift intensity to break the plateau";
      }
      // Medium volume: standard structural advice
      if (goal === "strength") {
        return w != null
          ? `Wave the load over 3 sessions, then test ${w} kg — reset the stimulus`
          : "Try a short deload or wave loading — straight linear jumps won't break this";
      }
      if (goal === "hypertrophy") {
        return "Vary your rep range or add a back-off set — the muscle needs a new stimulus";
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
        // High recent volume may be accumulating fatigue — offer a concrete action
        return "Volume may be a factor — hold load and drop a set if the dip continues next session";
      }
      if (sleepQuality === "high") {
        // Recovery is fine — may be a one-off; monitor before reacting
        return "Recovery looks solid — monitor next session; if the dip continues, consider a small load reduction";
      }
      // Medium sleep, medium volume: standard hold-steady
      return "Hold current load and focus on quality reps — output will recover";
    }

    // ── Regression: both latest delta and short trend are negative ────────────
    case "regressing": {
      if (experience === "beginner") {
        return "Step back 10% and rebuild with consistent reps — beginners recover fast with steady, quality work";
      }
      if (sleepQuality === "low") {
        return "Recovery is compromised — deload now and fix sleep before resuming progression";
      }
      // High volume + repeated exposure: fatigue accumulation is plausible, but state it honestly
      if (recentVolumeLevel === "high" && sessionCount >= 5) {
        return "Recent sessions have been heavy — reduce load and volume for a session before rebuilding";
      }
      if (w != null && r != null) {
        return confidence === "high"
          ? `Deload to ${w} kg × ${r} reps — stop the decline before it compounds`
          : `Step back to ${w} kg × ${r} reps and rebuild`;
      }
      return "Deload, then reassess form, frequency, and recovery before adding load";
    }

    // ── Clear forward momentum ────────────────────────────────────────────────
    case "progressing": {
      if (goal === "hypertrophy" && recentVolumeLevel === "low") {
        // Gains happening but volume is light — an extra set could compound the progress
        return w != null && r != null
          ? `Keep going — target ${w} kg × ${r} reps, and consider adding a back-off set`
          : "Keep going — consider adding a back-off set to build on this momentum";
      }
      if (w != null && r != null) {
        if (goal === "strength")    return `Strong signal — push to ${w} kg × ${r} reps`;
        if (goal === "hypertrophy") return `Keep volume climbing — target ${w} kg × ${r} reps, or add a back-off set`;
        return `Keep going — next: ${w} kg × ${r} reps`;
      }
      if (goal === "strength")    return "Add weight when reps feel smooth — bias toward heavier loads";
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
        return "Small gains are real gains — keep volume consistent and let the adaptation accumulate";
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
