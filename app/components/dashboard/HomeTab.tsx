"use client";

import { ChevronRight, Plus as LucidePlus } from "lucide-react";
import LevelBadge from "../LevelBadge";
import TodayFocusCard from "./TodayFocusCard";
import CoachSnapshotCard from "./CoachSnapshotCard";
import WeeklySnapshotCard from "./WeeklySnapshotCard";
import type {
  ExercisePrescription,
  ExerciseProgression,
  TrainingDay,
  TrainingPlan,
  WorkoutSession,
  WorkoutTemplate,
} from "@/app/types";

type HomeTabProps = {
  userEmail: string | undefined;
  level: number;
  onOpenProfile: () => void;
  onStartWorkout: () => void;
  onShowTemplates: () => void;
  userTemplatesCount: number;
  trainingPlan: TrainingPlan | null;
  nextDay: TrainingDay | null;
  nextDayIndex: number | null;
  allTemplates: WorkoutTemplate[];
  lastCompletedDay: TrainingDay | null;
  lastCompletedAt: number | null;
  coachHint?: string;
  onStartFromDay: (day: TrainingDay, dayIndex: number) => void;
  onSetupPlan: () => void;
  onSkipDay: (() => void) | undefined;
  progressions: ExerciseProgression[];
  getPrescription: (name: string) => ExercisePrescription | undefined;
  history: WorkoutSession[];
  streak?: number;
  onShowProgress?: () => void;
};

export default function HomeTab({
  userEmail,
  level,
  onOpenProfile,
  onStartWorkout,
  onShowTemplates,
  userTemplatesCount,
  trainingPlan,
  nextDay,
  nextDayIndex,
  allTemplates,
  coachHint,
  onStartFromDay,
  onSetupPlan,
  onSkipDay,
  progressions,
  getPrescription,
  history,
  streak,
  onShowProgress,
}: HomeTabProps) {
  return (
    <>
      {/* 1. Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
            AP-Tracking
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <LevelBadge level={level} onClick={onOpenProfile} />
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-sm font-black text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            {userEmail?.[0]?.toUpperCase() ?? "?"}
          </button>
        </div>
      </header>

      {/* 2. Primary Action */}
      <button
        onClick={onStartWorkout}
        className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase transition-all shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:shadow-[0_0_36px_rgba(239,68,68,0.5)] mb-4"
      >
        <span className="inline-flex items-center gap-2"><LucidePlus size={16} /> Start Workout</span>
      </button>

      {/* 3. Quick Access */}
      <div className="space-y-2 mb-4">
        <button
          onClick={onShowTemplates}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 hover:border-zinc-700 transition-colors"
        >
          <span className="text-sm font-semibold text-zinc-400">Templates</span>
          <span className="inline-flex items-center gap-0.5 text-xs text-zinc-600">
            {userTemplatesCount > 0 ? `${userTemplatesCount} saved` : "Create one"} <ChevronRight size={13} />
          </span>
        </button>

        {trainingPlan && (
          <button
            onClick={onSetupPlan}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 hover:border-zinc-700 transition-colors"
          >
            <span className="text-sm font-semibold text-zinc-400">Plan</span>
            <span className="inline-flex items-center gap-0.5 text-xs text-zinc-600">
              {trainingPlan.name} <ChevronRight size={13} />
            </span>
          </button>
        )}
      </div>

      {/* 4. Weekly Snapshot */}
      <WeeklySnapshotCard
        history={history}
        streak={streak}
        plannedWorkouts={trainingPlan?.days.length}
      />

      {/* 5. Today Focus */}
      <TodayFocusCard
        nextDay={nextDay}
        nextDayIndex={nextDayIndex}
        allTemplates={allTemplates}
        planName={trainingPlan?.name}
        coachHint={coachHint}
        onStartFromDay={onStartFromDay}
        onSetupPlan={onSetupPlan}
        onSkipDay={onSkipDay}
      />

      {/* 6. Coach Actions */}
      <CoachSnapshotCard
        progressions={progressions}
        getPrescription={getPrescription}
        onReview={onShowProgress}
      />
    </>
  );
}
