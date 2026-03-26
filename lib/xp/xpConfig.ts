import type { XpEventType } from "../../app/types";

export const XP_VALUES: Record<XpEventType, number> = {
  daily_login: 5,          // legacy value — kept so old rows remain parseable
  daily_check_in: 5,
  rest_day_check_in: 10,
  workout_completed: 40,
  pr_achieved: 100,
  streak_extended: 10,
};

export const LEVEL_THRESHOLDS: number[] = [
  0,     // level 1
  100,   // level 2
  250,   // level 3
  450,   // level 4
  700,   // level 5
  1000,  // level 6
  1350,  // level 7
  1750,  // level 8
  2200,  // level 9
  2700,  // level 10
  3250,  // level 11
  3850,  // level 12
  4500,  // level 13
  5200,  // level 14
  5950,  // level 15
  6750,  // level 16
  7600,  // level 17
  8500,  // level 18
  9450,  // level 19
  10450, // level 20
];
