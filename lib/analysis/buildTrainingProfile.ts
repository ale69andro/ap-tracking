import type {
  UserProfile,
  TrainingProfile,
  StressLevel,
  IntensityStyle,
  ProximityToFailure,
  EquipmentAccess,
  LoadProgressionStyle,
  MuscleGroup,
  EnergyLevel,
  DailyCheckIn,
} from "@/app/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stressDelta(stress: StressLevel): number {
  if (stress === "low")      return  25;
  if (stress === "moderate") return   0;
  /* high */                 return -25;
}

function frequencyDelta(days: number | undefined): number {
  if (days === undefined) return 0;
  if (days > 5)  return -10;
  if (days <= 3) return  10;
  return 0;
}

function experienceDelta(experience: UserProfile["experience"] | undefined): number {
  return experience === "beginner" ? 5 : 0;
}

function sleepDelta(sleep: UserProfile["sleepQuality"] | undefined): number {
  if (sleep === "high") return  10;
  if (sleep === "low")  return -15;
  /* medium or undefined */ return 0;
}

function deriveRecoveryScore(
  stress: StressLevel,
  trainingDaysPerWeek: number | undefined,
  experience: UserProfile["experience"] | undefined,
  sleep: UserProfile["sleepQuality"] | undefined,
): number {
  const base  = 75;
  const score = base
    + stressDelta(stress)
    + frequencyDelta(trainingDaysPerWeek)
    + experienceDelta(experience)
    + sleepDelta(sleep);
  return Math.min(100, Math.max(0, score));
}

function deriveLoadProgressionStyle(
  experience: UserProfile["experience"],
  stress: StressLevel,
): LoadProgressionStyle {
  if (experience === "beginner")      return "linear";
  if (experience === "intermediate")  return "double_progression";

  // Advanced
  if (stress === "high") return "double_progression";
  return "wave_loading";
}

/**
 * Derives a three-tier recovery readiness from static profile + optional daily energy.
 *
 * Rules:
 * - Static signals (sleep, stress, frequency) form the base tier.
 * - Low energy + any negative profile signal → "low" (two bad signals needed).
 * - Low energy alone → at most "medium" (single subjective signal is not enough).
 * - High energy can soften a static "low" to "medium", but cannot elevate to "high".
 * - Medium/absent energy → static profile only.
 */
function deriveRecoveryTier(
  sleep: UserProfile["sleepQuality"] | undefined,
  stress: StressLevel,
  days: number | undefined,
  energyLevel?: EnergyLevel | null,
): "low" | "medium" | "high" {
  const staticLow  = sleep === "low" && (stress === "high" || (days !== undefined && days > 5));
  const staticHigh = sleep === "high" && stress === "low";

  if (energyLevel === "low") {
    // Two-signal rule: low energy + any negative static indicator → low
    if (staticLow || sleep === "low" || stress === "high") return "low";
    return "medium";
  }

  if (energyLevel === "high") {
    // High energy softens but cannot fully override a bad static profile
    if (staticLow)  return "medium";
    if (staticHigh) return "high";
    return "medium";
  }

  // No energy signal (or "medium") — fall back to static profile
  if (staticLow)  return "low";
  if (staticHigh) return "high";
  return "medium";
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function buildTrainingProfile(
  profile: UserProfile,
  dailyCheckIn?: DailyCheckIn | null,
): TrainingProfile {
  const stress: StressLevel             = profile.stressLevel          ?? "moderate";
  const intensity: IntensityStyle       = profile.intensityStyle        ?? "mixed";
  const proximity: ProximityToFailure   = profile.proximityToFailure    ?? "one_to_two_rir";
  const access: EquipmentAccess         = profile.equipmentAccess       ?? "full_gym";
  const priorityMuscles: MuscleGroup[]  = profile.priorityMuscleGroups  ?? [];
  const days                            = profile.trainingDaysPerWeek ?? 4;

  const recoveryScore = deriveRecoveryScore(
    stress,
    days,
    profile.experience,
    profile.sleepQuality,
  );

  const recoveryTier = deriveRecoveryTier(
    profile.sleepQuality,
    stress,
    days,
    dailyCheckIn?.energyLevel,
  );
  const loadProgressionStyle = deriveLoadProgressionStyle(profile.experience, stress);

  return {
    recoveryScore,
    recoveryTier,
    loadProgressionStyle,
    priorityMuscleGroups: priorityMuscles,
    intensityStyle: intensity,
    proximityToFailure: proximity,
    equipmentAccess: access,
    experience: profile.experience,
    goal: profile.goal,
    sleepQuality: profile.sleepQuality,
    stressLevel: stress,
    trainingDaysPerWeek: days,
  };
}
