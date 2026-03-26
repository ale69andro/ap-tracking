/**
 * Check-In Demo Presets — DEV USE ONLY.
 *
 * Each preset provides static XP / level / streak values that override
 * the real useXp data when the Check-in Demo is active in CoachTestPanel.
 * No Supabase writes occur in demo mode.
 */

export type CheckInPresetId =
  | "normal_training"
  | "near_level_up"
  | "new_streak"
  | "long_streak";

export type CheckInPreset = {
  id:              CheckInPresetId;
  label:           string;
  level:           number;
  xpIntoLevel:     number;
  xpNeededForLevel: number;
  currentStreak:   number;
};

export const CHECK_IN_PRESETS: CheckInPreset[] = [
  {
    id:              "normal_training",
    label:           "Normal (training/rest, streak 4)",
    level:           4,
    xpIntoLevel:     340,
    xpNeededForLevel: 450,
    currentStreak:   4,
  },
  {
    id:              "near_level_up",
    label:           "Near Level-Up (+5 XP triggers it)",
    level:           4,
    xpIntoLevel:     445,
    xpNeededForLevel: 450,
    currentStreak:   4,
  },
  {
    id:              "new_streak",
    label:           "New Streak (streak = 0)",
    level:           4,
    xpIntoLevel:     340,
    xpNeededForLevel: 450,
    currentStreak:   0,
  },
  {
    id:              "long_streak",
    label:           "Long Streak (streak = 14)",
    level:           4,
    xpIntoLevel:     340,
    xpNeededForLevel: 450,
    currentStreak:   14,
  },
];
