/** Local session shape used for analysis — distinct from app/types ExerciseSession. */
type AnalysisSession = {
  date: string;
  bestWeight: number;
  bestReps: number;
  bestEstimated1RM: number;
};

export type ExerciseAnalysis = {
  status: "progression" | "stagnation" | "regression" | "not-enough-data";
  suggestion: string;
};

export function analyzeExercise(history: AnalysisSession[]): ExerciseAnalysis {
  if (!history || history.length < 2) {
    return { status: "not-enough-data", suggestion: "Not enough data yet" };
  }

  const values = history.slice(-3).map((s) => s.bestEstimated1RM);
  const last = values[values.length - 1];
  const previous = values[values.length - 2];
  const allSame = values.every((v) => v === values[0]);

  if (last > previous) {
    return { status: "progression", suggestion: "Increase weight slightly next session" };
  }

  if (allSame && values.length >= 3) {
    return { status: "stagnation", suggestion: "Try adding reps or slightly increasing weight" };
  }

  if (last < previous) {
    return { status: "regression", suggestion: "Reduce weight slightly or improve recovery" };
  }

  return { status: "stagnation", suggestion: "Try adding reps or slightly increasing weight" };
}