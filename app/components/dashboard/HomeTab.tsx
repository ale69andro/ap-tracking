"use client";

import { ChevronRight, Plus as LucidePlus } from "lucide-react";
import LevelBadge from "../LevelBadge";
import ProgressionCard from "../ProgressionCard";
import TrainingDayCard from "../TrainingDayCard";
import { getSessionDate } from "@/app/hooks/useWorkout";
import { getEffectiveSets } from "@/app/lib/workout";
import type { AcceptPrescriptionParams } from "@/app/hooks/usePrescriptions";
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
  acceptPrescription: (params: AcceptPrescriptionParams) => Promise<void>;
  onSelectExercise: (p: ExerciseProgression) => void;
  history: WorkoutSession[];
  onSelectWorkout: (w: WorkoutSession) => void;
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
  lastCompletedDay,
  lastCompletedAt,
  coachHint,
  onStartFromDay,
  onSetupPlan,
  onSkipDay,
  progressions,
  getPrescription,
  acceptPrescription,
  onSelectExercise,
  history,
  onSelectWorkout,
}: HomeTabProps) {
  return (
    <>
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

      <button
        onClick={onStartWorkout}
        className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase transition-all shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:shadow-[0_0_36px_rgba(239,68,68,0.5)] mb-4"
      >
        <span className="inline-flex items-center gap-2"><LucidePlus size={16} /> Start Workout</span>
      </button>

      <button
        onClick={onShowTemplates}
        className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 mb-4 hover:border-zinc-700 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-400">Templates</span>
        <span className="inline-flex items-center gap-0.5 text-xs text-zinc-600">
          {userTemplatesCount > 0 ? `${userTemplatesCount} saved` : "Create one"} <ChevronRight size={13} />
        </span>
      </button>

      <TrainingDayCard
        plan={trainingPlan}
        nextDay={nextDay}
        nextDayIndex={nextDayIndex}
        templates={allTemplates}
        lastCompletedDay={lastCompletedDay}
        lastCompletedAt={lastCompletedAt}
        coachHint={coachHint}
        onStart={onStartFromDay}
        onSetup={onSetupPlan}
        onSkip={onSkipDay}
      />

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Progression</h2>
          {progressions.length > 0 && (
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">
              {progressions.length} exercise{progressions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {progressions.length > 0 ? (
          <div className="space-y-3">
            {progressions.map((p) => (
              <ProgressionCard
                key={p.name}
                progression={p}
                onTap={() => onSelectExercise(p)}
                activePrescription={getPrescription(p.name)}
                onAcceptPrescription={acceptPrescription}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-700 text-center py-6">Complete a workout to see your progression.</p>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-bold text-white">Recent Workouts</h2>
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">{history.length} total</span>
          </div>
          <div className="space-y-2">
            {history.map((w) => {
              const mins = Math.round((w.durationSeconds ?? 0) / 60);
              const totalSets = w.exercises.reduce((n, e) => n + getEffectiveSets(e.sets).length, 0);
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWorkout(w)}
                  className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3.5 hover:border-zinc-700 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-bold text-zinc-100">{w.name}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5 truncate">
                      {w.exercises.map((e) => e.exerciseName).join(", ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-zinc-400">{getSessionDate(w)}</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">
                      {mins > 0 ? `${mins} min · ` : ""}
                      {w.exercises.length} ex · {totalSets} sets
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
