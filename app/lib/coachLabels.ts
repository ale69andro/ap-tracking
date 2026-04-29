import type { ExerciseRecommendationAction } from "@/app/types";

export const ACTION_LABEL: Partial<Record<ExerciseRecommendationAction, string>> = {
  increase_load: "Add weight",
  increase_reps: "Build reps",
  hold:          "Hold load",
  reduce_load:   "Reduce load",
  deload:        "Deload",
};
