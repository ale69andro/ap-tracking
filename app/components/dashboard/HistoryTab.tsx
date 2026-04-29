"use client";

import HistoryScreen from "../HistoryScreen";
import type { WorkoutSession } from "@/app/types";

type HistoryTabProps = {
  history: WorkoutSession[];
  onStartWorkout: () => void;
  onDeleteWorkout: (id: string) => Promise<void>;
};

export default function HistoryTab({ history, onStartWorkout, onDeleteWorkout }: HistoryTabProps) {
  return (
    <HistoryScreen
      history={history}
      onStartWorkout={onStartWorkout}
      onDeleteWorkout={onDeleteWorkout}
    />
  );
}
