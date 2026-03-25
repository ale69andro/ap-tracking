import { LEVEL_THRESHOLDS } from "./xpConfig";

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getXpIntoCurrentLevel(totalXp: number): number {
  const level = getLevelFromXp(totalXp);
  return totalXp - LEVEL_THRESHOLDS[level - 1];
}

export function getXpNeededForNextLevel(totalXp: number): number {
  const level = getLevelFromXp(totalXp);
  if (level >= LEVEL_THRESHOLDS.length) return 0;
  return LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1];
}

export function getAvatarStage(level: number): string {
  if (level >= 20) return "Elite";
  if (level >= 10) return "Athletic";
  if (level >= 5) return "Consistent";
  return "Beginner";
}
