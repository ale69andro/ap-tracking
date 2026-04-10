import type {
  UserProfile,
  TrainingProfile,
  StressLevel,
  IntensityStyle,
  ProximityToFailure,
  EquipmentAccess,
  LoadProgressionStyle,
  MuscleGroup,
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

// ─── Main Export ──────────────────────────────────────────────────────────────

export function buildTrainingProfile(profile: UserProfile): TrainingProfile {
  const stress: StressLevel             = profile.stressLevel          ?? "moderate";
  const intensity: IntensityStyle       = profile.intensityStyle        ?? "mixed";
  const proximity: ProximityToFailure   = profile.proximityToFailure    ?? "one_to_two_rir";
  const access: EquipmentAccess         = profile.equipmentAccess       ?? "full_gym";
  const priorityMuscles: MuscleGroup[]  = profile.priorityMuscleGroups  ?? [];

  const recoveryScore = deriveRecoveryScore(
    stress,
    profile.trainingDaysPerWeek,
    profile.experience,
    profile.sleepQuality,
  );

  const loadProgressionStyle = deriveLoadProgressionStyle(profile.experience, stress);

  return {
    recoveryScore,
    loadProgressionStyle,
    priorityMuscleGroups: priorityMuscles,
    intensityStyle: intensity,
    proximityToFailure: proximity,
    equipmentAccess: access,
  };
}
