"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ExerciseCard from "../components/ExerciseCard";
import ProgressionCard from "../components/ProgressionCard";
import ExerciseDetailSheet from "../components/ExerciseDetailSheet";
import WorkoutTimer from "../components/WorkoutTimer";
import TemplatesSheet from "../components/TemplatesSheet";
import WorkoutDetailSheet from "../components/WorkoutDetailSheet";
import WorkoutSummaryScreen from "../components/WorkoutSummaryScreen";
import SessionMomentumToast from "../components/SessionMomentumToast";
import HistoryScreen from "../components/HistoryScreen";
import ProgressScreen from "../components/ProgressScreen";
import ProfileSetupScreen from "../components/ProfileSetupScreen";
import ProfileEditSheet from "../components/ProfileEditSheet";
import LevelBadge from "../components/LevelBadge";
import { useWorkout, getSessionDate } from "../hooks/useWorkout";
import { getExerciseSuggestion } from "@/lib/analysis/getWorkoutSuggestion";
import { useXp } from "../hooks/useXp";
import { useProfile } from "../hooks/useProfile";
import { getEffectiveSets, computeStrengthDelta, type PRRecord } from "../lib/workout";
import { useProgression } from "../hooks/useProgression";
import { useTemplates } from "../hooks/useTemplates";
import { useAuth } from "../hooks/useAuth";
import { useExerciseLibrary } from "../hooks/useExerciseLibrary";
import { useTrainingPlan } from "../hooks/useTrainingPlan";
import { useScrollLock } from "../hooks/useScrollLock";
import { useWakeLock } from "../hooks/useWakeLock";
import AddExerciseModal from "../components/AddExerciseModal";
import ConfirmModal from "../components/ConfirmModal";
import TrainingDayCard from "../components/TrainingDayCard";
import TrainingPlanSheet from "../components/TrainingPlanSheet";
import DailyCheckIn from "../components/DailyCheckIn";
import { computeMuscleGroupLoadMap } from "@/lib/analysis/smartCoach";
import { getTrainingDayHint } from "@/app/lib/trainingDayHint";
import { COACH_TEST_SCENARIOS, COACH_TEST_INITIAL } from "../constants/coachTestScenarios";
import type { CoachTestState } from "../constants/coachTestScenarios";
import { CHECK_IN_PRESETS } from "../constants/checkInTestPresets";
import CoachTestPanel from "../components/CoachTestPanel";
import PRToast, { type PRType } from "../components/PRToast";
import { PRESET_TEMPLATES } from "../constants/presetTemplates";
import type { Equipment, ExerciseProgression, SessionExercise, ExerciseSet, ActiveTimer, TemplateExercise, TrainingDay, WorkoutSession, WorkoutTemplate, XpEventType } from "../types";
import { calculate1RM } from "@/lib/analysis/calculate1RM";
import { getExerciseTargets, parseMiddleRep } from "@/lib/analysis/getExerciseTargets";
import { useEffect } from "react";
import { useDailyCheckIn } from "../hooks/useDailyCheckIn";
import type { DayType, EnergyLevel } from "../hooks/useDailyCheckIn";
import { ChevronRight, Plus as LucidePlus } from "lucide-react";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconProgress() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12l-4-4-6 6-4-4-4 4" />
    </svg>
  );
}

// ─── Sortable exercise card (drag-and-drop wrapper) ───────────────────────────

type SortableExerciseCardProps = {
  exercise: SessionExercise;
  activeTimer: ActiveTimer | null;
  lastSession?: { topWeight: number; topReps: number };
  progression?: ExerciseProgression;
  onDelete: () => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, field: keyof Omit<ExerciseSet, "id" | "completed" | "completedAt">, value: string) => void;
  onCompleteSet: (setId: string) => void;
  onUncompleteSet: (setId: string) => void;
  onClearTimer: () => void;
  onAdjustTimer: (delta: number) => void;
  onExtendTimer: (seconds: number) => void;
  onUpdateExerciseRest: (field: "warmupRestSeconds" | "workingRestSeconds", value: number) => void;
  suggestion?: import("../types").WorkoutSuggestion;
  onOpenDetail?: () => void;
};

function SortableExerciseCard(props: SortableExerciseCardProps) {
  const { setNodeRef, transform, transition, isDragging, listeners, attributes } = useSortable({ id: props.exercise.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      <ExerciseCard {...props} dragHandleProps={{ ...listeners, ...attributes }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function pickMomentumMessage(prs: PRRecord[], history: WorkoutSession[]): string {
  if (prs.length > 0) return "🏆 New PR — well done";
  if (history.length > 0) {
    const delta = computeStrengthDelta(history[0], history.slice(1));
    if (delta !== null && delta > 3) return "📈 Strength is trending up";
  }
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentDays = new Set(
    history
      .filter((s) => s.startedAt >= sevenDaysAgo)
      .map((s) => new Date(s.startedAt).toDateString()),
  ).size;
  if (recentDays >= 3) return `🔥 ${recentDays} training days this week`;
  return "💪 Solid work today";
}

export default function Home() {
  const [tab, setTab]                       = useState<"home" | "history" | "progress">("home");
  const [showModal, setShowModal]           = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseProgression | null>(null);
  const [showTemplates, setShowTemplates]   = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isEditingName, setIsEditingName]   = useState(false);
  const [pendingExit, setPendingExit]     = useState<"discard" | "save" | null>(null);
  const [confirming, setConfirming]       = useState(false);
  const [saveError, setSaveError]         = useState(false);
  const [showProfileSheet, setShowProfileSheet]   = useState(false);
  const [showTrainingPlan, setShowTrainingPlan]   = useState(false);
  const [planDraftDays, setPlanDraftDays]         = useState<TrainingDay[]>([]);
  const [pendingTemplateDayId, setPendingTemplateDayId] = useState<string | null>(null);
  const [coachTest, setCoachTest] = useState<CoachTestState>(COACH_TEST_INITIAL);
  const [skippedSetsCount, setSkippedSetsCount] = useState(0);
  const [checkInDismissed,  setCheckInDismissed]  = useState(false);
  const [checkInConfirming, setCheckInConfirming] = useState(false);
  const [prFlash, setPrFlash] = useState<{ type: PRType; exerciseName: string; value: number } | null>(null);
  const [sessionPRs, setSessionPRs] = useState<PRRecord[]>([]);
  const [momentumMessage, setMomentumMessage] = useState<string | null>(null);
  const handlePrDismiss = useCallback(() => setPrFlash(null), []);

  const { user, loading: authLoading, signOut } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading, saveProfile } = useProfile(userId);

  const {
    totalXp,
    level,
    xpIntoLevel,
    xpNeededForLevel,
    currentStreak,
    longestStreak,
    hasCheckedInToday,
    hasCompletedWorkoutToday,
    loading: xpLoading,
    awardXp,
  } = useXp(userId ?? null);

  const { submitCheckIn } = useDailyCheckIn(userId);

  // Stable ref so useWorkout always has a callback without history being needed yet.
  const onSaveSuccessRef = useRef<(savedWorkout: WorkoutSession) => Promise<void>>(
    async () => {},
  );

  const {
    activeWorkout,
    completedSession,
    history,
    activeTimer,
    addExercise,
    deleteExercise,
    reorderExercises,
    deleteSet,
    addSet,
    updateSet,
    completeSet,
    uncompleteSet,
    updateExerciseRest,
    saveWorkout,
    resetWorkout,
    deleteWorkout,
    startWorkout,
    renameWorkout,
    clearTimer,
    adjustTimer,
    extendTimer,
    dismissSummary,
  } = useWorkout(userId, profile?.restTimerSound ?? false, (w) => onSaveSuccessRef.current(w));

  const handleDismissSummary = useCallback(() => {
    setMomentumMessage(pickMomentumMessage(sessionPRs, history));
    setSessionPRs([]);
    dismissSummary();
  }, [sessionPRs, history, dismissSummary]);

  // onSaveSuccess: award XP after a workout is saved.
  // Defined here so it can safely reference `history` (from useWorkout above).
  const onSaveSuccess = useCallback(
    async (savedWorkout: WorkoutSession) => {
      await awardXp("workout_completed" as XpEventType);
      // PR check — load PR signal only (topWeight this session > bestWeight in history)
      for (const exercise of savedWorkout.exercises) {
        const completedSets = exercise.sets.filter((s) => s.completed);
        if (completedSets.length === 0) continue;
        const topWeightThisSession = Math.max(
          ...completedSets.map((s) => parseFloat(s.weight) || 0),
        );
        const historicalBest = history
          .filter((w) => w.id !== savedWorkout.id)
          .flatMap((w) => w.exercises)
          .filter((e) => e.exerciseName === exercise.exerciseName)
          .flatMap((e) => e.sets.filter((s) => s.completed))
          .reduce((best, s) => Math.max(best, parseFloat(s.weight) || 0), 0);
        if (historicalBest > 0 && topWeightThisSession > historicalBest) {
          await awardXp("pr_achieved" as XpEventType, { exercise: exercise.exerciseName });
          break;
        }
      }
    },
    [awardXp, history],
  );
  onSaveSuccessRef.current = onSaveSuccess;

  // handleCompleteSet: wraps completeSet with instant PR detection.
  // Checks e1RM PR first, then weight PR. Shows PRToast and awards XP if new PR found.
  // Warm-up sets are excluded via set.type check. XP is idempotent per day.
  const handleCompleteSet = useCallback(
    (exId: string, setId: string) => {
      const exercise = activeWorkout?.exercises.find((e) => e.id === exId);
      const set = exercise?.sets.find((s) => s.id === setId);

      if (set && exercise && set.type !== "Warm-up") {
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps) || 0;

        if (w > 0 && r > 0) {
          const thisE1rm = calculate1RM(w, r);

          const historicalSets = history
            .flatMap((session) => session.exercises)
            .filter((e) => e.exerciseName === exercise.exerciseName)
            .flatMap((e) => getEffectiveSets(e.sets));

          // Also include sets already completed earlier in the current session
          // (excluding the set being completed right now, by id)
          const sessionPriorSets = exercise.sets.filter(
            (s) => s.completed === true && s.type !== "Warm-up" && s.id !== setId,
          );

          const allPriorSets = [...historicalSets, ...sessionPriorSets];

          const bestPriorE1rm = allPriorSets.reduce((best, s) => {
            const sw = parseFloat(s.weight) || 0;
            const sr = parseFloat(s.reps) || 0;
            return Math.max(best, calculate1RM(sw, sr));
          }, 0);

          const bestPriorWeight = allPriorSets.reduce(
            (best, s) => Math.max(best, parseFloat(s.weight) || 0),
            0,
          );

          if (bestPriorE1rm > 0 && thisE1rm > bestPriorE1rm) {
            setPrFlash({ type: "e1rm", exerciseName: exercise.exerciseName, value: Math.round(thisE1rm * 10) / 10 });
            setSessionPRs((prev) => {
              const exists = prev.find((p) => p.exerciseName === exercise.exerciseName);
              if (exists) return exists.type === "e1rm" ? prev : prev.map((p) => p.exerciseName === exercise.exerciseName ? { ...p, type: "e1rm" as const } : p);
              return [...prev, { exerciseName: exercise.exerciseName, type: "e1rm" as const }];
            });
            void awardXp("pr_achieved" as XpEventType, { exercise: exercise.exerciseName });
          } else if (bestPriorWeight > 0 && w > bestPriorWeight) {
            setPrFlash({ type: "weight", exerciseName: exercise.exerciseName, value: w });
            setSessionPRs((prev) => {
              if (prev.some((p) => p.exerciseName === exercise.exerciseName)) return prev;
              return [...prev, { exerciseName: exercise.exerciseName, type: "weight" as const }];
            });
            void awardXp("pr_achieved" as XpEventType, { exercise: exercise.exerciseName });
          }
        }
      }

      completeSet(exId, setId);
    },
    [activeWorkout, history, completeSet, awardXp],
  );

  const handleCheckInContinue = useCallback(
    async (dayType: DayType, energyLevel?: EnergyLevel) => {
      setCheckInConfirming(true);
      await submitCheckIn(dayType, energyLevel);
      await awardXp(dayType === "rest" ? "rest_day_check_in" : "daily_check_in");
    },
    [submitCheckIn, awardXp],
  );

  const handleCheckInDismiss = useCallback(() => {
    setCheckInConfirming(false);
    setCheckInDismissed(true);
  }, []);

  // "Today already handled" — true when any meaningful activity has been recorded.
  // Covers: explicit check-in (training/rest), legacy daily_login, or completed workout.
  const todayAlreadyHandled = hasCheckedInToday || hasCompletedWorkoutToday;

  // ── Check-in demo mode (dev only) ─────────────────────────────────────────
  // When a preset is active: override XP/streak props and no-op the handler.
  const activeCheckInPreset = process.env.NODE_ENV === "development"
    ? (CHECK_IN_PRESETS.find((p) => p.id === coachTest.checkInPresetId) ?? null)
    : null;

  const checkInLevel           = activeCheckInPreset?.level           ?? level;
  const checkInXpIntoLevel     = activeCheckInPreset?.xpIntoLevel     ?? xpIntoLevel;
  const checkInXpNeededForLevel = activeCheckInPreset?.xpNeededForLevel ?? xpNeededForLevel;
  const checkInCurrentStreak   = activeCheckInPreset?.currentStreak   ?? currentStreak;

  const handleCheckInContinueDemo = useCallback(async () => {}, []);
  const effectiveCheckInContinue = activeCheckInPreset ? handleCheckInContinueDemo : handleCheckInContinue;

  const showDailyCheckIn =
    (activeCheckInPreset !== null && !checkInDismissed) ||
    ((!!userId &&
    !authLoading &&
    !xpLoading &&
    !(activeWorkout !== null) &&
    !todayAlreadyHandled &&
    !checkInDismissed)
    || checkInConfirming);

  // Lock body scroll whenever any sheet or modal overlay is visible.
  // Must be after useWorkout so completedSession is initialised.
  useScrollLock(
    showDailyCheckIn ||
    showModal        ||
    showTemplates    ||
    showTrainingPlan ||
    showProfileSheet ||
    !!selectedExercise ||
    !!selectedWorkout  ||
    !!pendingExit      ||
    !!completedSession
  );

  // Scroll to top whenever a new workout is started.
  // Runs after useScrollLock's cleanup (which restores the previous scroll position),
  // so it always wins and the user lands at exercise 1.
  useEffect(() => {
    if (activeWorkout?.id) window.scrollTo(0, 0);
  }, [activeWorkout?.id]);

  const workoutActive = activeWorkout !== null;
  useWakeLock(workoutActive && profile?.keepScreenOn !== false);
  const exercises     = activeWorkout?.exercises ?? [];
  const incompleteSetsCount = activeWorkout?.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => !s.completed).length, 0
  ) ?? 0;

  const exerciseDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) reorderExercises(oldIndex, newIndex);
  };

  const { templates, saveTemplate, deleteTemplate } = useTemplates(userId);
  const { userExercises, createUserExercise } = useExerciseLibrary(userId);

  const {
    plan: trainingPlan,
    nextDay,
    nextDayIndex,
    lastCompletedDay,
    lastCompletedAt,
    setPlan: saveTrainingPlan,
    markDayCompleted,
    clearPlan: clearTrainingPlan,
  } = useTrainingPlan(userId);

  const progressions = useProgression(history, templates, profile?.experience);

  // ── Coach test overrides (dev only) ───────────────────────────────────────
  const activeScenario = COACH_TEST_SCENARIOS.find((s) => s.id === coachTest.scenarioId) ?? null;
  const effectiveProgressions = activeScenario?.progressions ?? progressions;
  const effectiveProfile = useMemo(
    () => (coachTest.profileOverride && profile ? { ...profile, ...coachTest.profileOverride } : profile),
    [profile, coachTest.profileOverride],
  );

  const muscleLoadMap = useMemo(
    () => computeMuscleGroupLoadMap(effectiveProgressions),
    [effectiveProgressions],
  );
  const effectiveMuscleLoadMap = activeScenario?.muscleLoadOverride ?? muscleLoadMap;

  const coachHint = useMemo(
    () => getTrainingDayHint(nextDay, templates, effectiveMuscleLoadMap),
    [nextDay, templates, effectiveMuscleLoadMap],
  );

  const allTemplatesForDisplay = useMemo(
    () => [...PRESET_TEMPLATES, ...templates],
    [templates],
  );
  const handleAddExercise = (name: string, muscleGroups: string[]) => {
    const prog = effectiveProgressions.find((p) => p.name === name);
    const targets = prog ? getExerciseTargets(prog) : null;

    const initialWeight =
      targets?.target?.weight != null ? String(targets.target.weight) :
      targets?.last?.weight != null   ? String(targets.last.weight)   : "";

    const initialReps =
      targets?.target?.repRange
        ? (() => { const m = parseMiddleRep(targets.target.repRange!); return m != null ? String(m) : ""; })()
        : targets?.last?.reps != null ? String(targets.last.reps) : "";

    addExercise(name, muscleGroups, initialWeight, initialReps);
  };

  const handleCreateCustomExercise = async (name: string, muscleGroups: string[], equipment?: Equipment) => {
    console.log("🔥 HANDLE CREATE CUSTOM CALLED");
    // Throws on DB error — AddExerciseModal catches and shows the error to the user.
    await createUserExercise(name, muscleGroups, equipment);
    addExercise(name, muscleGroups);
    setShowModal(false);
  };

  const handleStartFromTemplate = (template: WorkoutTemplate) => {
    startWorkout(template.name, template.id, template.exercises);
    setShowTemplates(false);
  };

  const handleStartFromDay = (day: TrainingDay, dayIndex: number) => {
    const allTemplates = [...PRESET_TEMPLATES, ...templates];
    const template = day.templateId ? allTemplates.find((t) => t.id === day.templateId) : undefined;
    const name = template?.name ? `Day ${day.dayNumber} – ${template.name}` : `Day ${day.dayNumber}`;
    startWorkout(name, template?.id, template?.exercises, dayIndex);
    setShowTrainingPlan(false);
  };

  /** Open the training plan sheet, initializing draft days from the current saved plan. */
  const openTrainingPlanSheet = () => {
    setPlanDraftDays(trainingPlan?.days ?? []);
    setShowTrainingPlan(true);
  };

  /**
   * Called when user taps "+" on a day row inside TrainingPlanSheet.
   * Records which day triggered template creation, then opens TemplatesSheet
   * on top — TrainingPlanSheet stays mounted but is hidden via CSS.
   */
  const handleCreateTemplateFromPlan = (dayId: string) => {
    setPendingTemplateDayId(dayId);
    setShowTemplates(true);
  };

  /**
   * Unified save handler for TemplatesSheet.
   * After saving, if triggered from the plan sub-flow, auto-selects the new
   * template for the triggering day, closes TemplatesSheet, and returns to plan.
   */
  const handleSaveTemplate = async (name: string, exercises: TemplateExercise[]) => {
    const newTemplate = await saveTemplate(name, exercises);
    if (pendingTemplateDayId && newTemplate) {
      setPlanDraftDays((prev) =>
        prev.map((d) =>
          d.id === pendingTemplateDayId ? { ...d, templateId: newTemplate.id } : d
        )
      );
      setPendingTemplateDayId(null);
      setShowTemplates(false);
    }
  };

  /**
   * Close handler for TemplatesSheet.
   * If the sheet was opened as part of the plan sub-flow, clears the pending
   * day ID so TrainingPlanSheet becomes visible again without auto-selecting.
   */
  const handleTemplatesClose = () => {
    setShowTemplates(false);
    setPendingTemplateDayId(null);
  };

  // When a workout that was started from a plan day is saved, advance the progress
  useEffect(() => {
    if (completedSession?.trainingDayIndex != null) {
      markDayCompleted(completedSession.trainingDayIndex);
    }
  }, [completedSession, markDayCompleted]);

  const handleConfirmExit = async () => {
    setConfirming(true);
    setSaveError(false);
    try {
      if (pendingExit === "save") {
        const skipped = await saveWorkout();
        setSkippedSetsCount(skipped ?? 0);
      } else resetWorkout();
      setPendingExit(null);
    } catch {
      setSaveError(true);
    } finally {
      setConfirming(false);
    }
  };

  // ── Strict gating ───────────────────────────────────────────────────────────
  if (authLoading || (userId !== null && profileLoading)) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (user && !profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-10 pb-10 max-w-xl mx-auto">
        <ProfileSetupScreen onSave={saveProfile} />
      </main>
    );
  }

  return (
    <>
      {showDailyCheckIn && (
        <DailyCheckIn
          level={checkInLevel}
          xpIntoLevel={checkInXpIntoLevel}
          xpNeededForLevel={checkInXpNeededForLevel}
          currentStreak={checkInCurrentStreak}
          onContinue={effectiveCheckInContinue}
          onDismiss={handleCheckInDismiss}
        />
      )}

      {showModal && (
        <AddExerciseModal
          userExercises={userExercises}
          onAdd={handleAddExercise}
          onCreateCustom={handleCreateCustomExercise}
          onClose={() => setShowModal(false)}
          progressions={effectiveProgressions}
        />
      )}
      {selectedExercise && (
        <ExerciseDetailSheet progression={selectedExercise} history={history} onClose={() => setSelectedExercise(null)} />
      )}
      {showTemplates && (
        <TemplatesSheet
          presets={PRESET_TEMPLATES}
          templates={templates}
          userExercises={userExercises}
          onStart={handleStartFromTemplate}
          onSave={handleSaveTemplate}
          onDelete={deleteTemplate}
          onClose={handleTemplatesClose}
          onCreateCustom={createUserExercise}
        />
      )}
      {showProfileSheet && profile && (
        <ProfileEditSheet
          profile={profile}
          onSave={saveProfile}
          onSignOut={signOut}
          onClose={() => setShowProfileSheet(false)}
          totalXp={totalXp}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />
      )}

      {showTrainingPlan && (
        // Wrapper hidden while TemplatesSheet is active — keeps the component
        // mounted (preserving name + labelEditedByUser state) but fully removes
        // it from the visible and interactable layer.
        <div className={showTemplates ? "hidden" : undefined}>
          <TrainingPlanSheet
            plan={trainingPlan}
            templates={templates}
            days={planDraftDays}
            onDaysChange={setPlanDraftDays}
            onSave={saveTrainingPlan}
            onClear={clearTrainingPlan}
            onClose={() => setShowTrainingPlan(false)}
            onCreateTemplate={handleCreateTemplateFromPlan}
          />
        </div>
      )}

      {selectedWorkout && (
        <WorkoutDetailSheet
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onDelete={async () => {
            await deleteWorkout(selectedWorkout.id);
            setSelectedWorkout(null);
          }}
        />
      )}

      {pendingExit && workoutActive && (
        <ConfirmModal
          title={pendingExit === "save" ? "Finish workout?" : "End workout?"}
          description={
            pendingExit === "save" && incompleteSetsCount > 0
              ? `You still have ${incompleteSetsCount} incomplete ${incompleteSetsCount === 1 ? "set" : "sets"}. These sets will not be saved. Do you still want to finish?`
              : pendingExit === "save"
              ? "Your workout will be saved."
              : "Your progress will be lost."
          }
          confirmLabel={pendingExit === "save" ? "Finish workout" : "End workout"}
          cancelLabel="Stay"
          loadingLabel={pendingExit === "save" ? "Saving..." : "Ending..."}
          loading={confirming}
          error={saveError ? "Couldn't save workout. Please try again. Your workout is still here." : undefined}
          onConfirm={handleConfirmExit}
          onCancel={() => { setPendingExit(null); setSaveError(false); }}
        />
      )}

      {completedSession && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
          <WorkoutSummaryScreen session={completedSession} onDone={handleDismissSummary} skippedSets={skippedSetsCount} previousSessions={history.slice(1)} prs={sessionPRs} />
        </div>
      )}

      {/* ── Bottom Navigation ───────────────────────────────────────────── */}
      {!workoutActive && <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/50">
        <div className="max-w-xl mx-auto flex items-end justify-around px-6 pb-5 pt-2">

          <button
            onClick={() => setTab("home")}
            className={`flex flex-col items-center gap-1 transition-colors ${tab === "home" && !workoutActive ? "text-red-500" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <IconHome />
            <span className="text-[10px] font-semibold tracking-wide">Home</span>
          </button>

          <button
            onClick={() => startWorkout()}
            className="flex flex-col items-center gap-1.5 -mt-5"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors">
              <IconPlus />
            </div>
            <span className="text-[10px] font-semibold tracking-wide text-zinc-500">Workout</span>
          </button>

          <button
            onClick={() => setTab("history")}
            className={`flex flex-col items-center gap-1 transition-colors ${tab === "history" && !workoutActive ? "text-red-500" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <IconHistory />
            <span className="text-[10px] font-semibold tracking-wide">History</span>
          </button>

          <button
            onClick={() => setTab("progress")}
            className={`flex flex-col items-center gap-1 transition-colors ${tab === "progress" && !workoutActive ? "text-red-500" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <IconProgress />
            <span className="text-[10px] font-semibold tracking-wide">Progress</span>
          </button>

        </div>
      </nav>}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-10 pb-32 max-w-xl mx-auto">

        {workoutActive ? (

          // ── Active Workout ─────────────────────────────────────────────
          null

        ) : tab === "history" ? (

          // ── History ────────────────────────────────────────────────────
          <HistoryScreen
            history={history}
            onStartWorkout={() => { setTab("home"); startWorkout(); }}
            onDeleteWorkout={deleteWorkout}
          />

        ) : tab === "progress" ? (

          // ── Progress ───────────────────────────────────────────────────
          <ProgressScreen progressions={effectiveProgressions} onTapExercise={setSelectedExercise} profile={effectiveProfile ?? undefined} nextDay={nextDay} templates={templates} />

        ) : (

          // ── Dashboard ──────────────────────────────────────────────────
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
                <LevelBadge level={level} onClick={() => setShowProfileSheet(true)} />
                <button
                  onClick={() => setShowProfileSheet(true)}
                  className="w-9 h-9 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-sm font-black text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </button>
              </div>
            </header>

            <button
              onClick={() => startWorkout()}
              className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase transition-all shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:shadow-[0_0_36px_rgba(239,68,68,0.5)] mb-4"
            >
              <span className="inline-flex items-center gap-2"><LucidePlus size={16} /> Start Workout</span>
            </button>

            <button
              onClick={() => setShowTemplates(true)}
              className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 mb-4 hover:border-zinc-700 transition-colors"
            >
              <span className="text-sm font-semibold text-zinc-400">Templates</span>
              <span className="inline-flex items-center gap-0.5 text-xs text-zinc-600">
                {templates.length > 0 ? `${templates.length} saved` : "Create one"} <ChevronRight size={13} />
              </span>
            </button>


            <TrainingDayCard
              plan={trainingPlan}
              nextDay={nextDay}
              nextDayIndex={nextDayIndex}
              templates={allTemplatesForDisplay}
              lastCompletedDay={lastCompletedDay}
              lastCompletedAt={lastCompletedAt}
              coachHint={coachHint}
              onStart={handleStartFromDay}
              onSetup={openTrainingPlanSheet}
            />

            {/* Progression */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Progression</h2>
                {effectiveProgressions.length > 0 && (
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                    {effectiveProgressions.length} exercise{effectiveProgressions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {effectiveProgressions.length > 0 ? (
                <div className="space-y-3">
                  {effectiveProgressions.map((p) => (
                    <ProgressionCard key={p.name} progression={p} onTap={() => setSelectedExercise(p)} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-700 text-center py-6">Complete a workout to see your progression.</p>
              )}
            </section>

            {/* Recent Workouts */}
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
                        onClick={() => setSelectedWorkout(w)}
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

        )}

        {activeWorkout && (
          // ── Active Workout ─────────────────────────────────────────────
          <>
            {/* Sticky header */}
            <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm -mx-4 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4 z-10 mb-5 border-b border-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <input
                      autoFocus
                      value={activeWorkout.name}
                      onChange={(e) => renameWorkout(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                      placeholder="Workout"
                      maxLength={40}
                      className="text-xl font-black text-white bg-transparent outline-none w-full placeholder-zinc-600 border-b border-zinc-700 pb-0.5"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xl font-black text-white text-left w-full truncate pb-0.5 border-b border-transparent hover:border-zinc-700 transition-colors"
                    >
                      {activeWorkout.name || "Workout"}
                    </button>
                  )}
                  <WorkoutTimer
                    startedAt={activeWorkout.startedAt}
                    className="text-xs font-mono text-zinc-500 tabular-nums mt-1 block"
                  />
                </div>
                <button
                  onClick={() => setPendingExit("discard")}
                  className="text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors py-1.5 px-3 rounded-xl hover:bg-zinc-800 shrink-0 mt-0.5"
                >
                  Cancel
                </button>
              </div>
            </header>

            {/* Exercise cards */}
            <DndContext sensors={exerciseDndSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
              <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {exercises.map((exercise) => {
                    const prog = effectiveProgressions.find((p) => p.name === exercise.exerciseName);
                    const lastSessions = prog?.recentSessions ?? [];
                    const lastSess = lastSessions.length > 0 ? lastSessions[lastSessions.length - 1] : undefined;
                    return (
                      <SortableExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        activeTimer={activeTimer}
                        lastSession={lastSess ? { topWeight: lastSess.topWeight, topReps: lastSess.topReps } : undefined}
                        progression={prog}
                        onDelete={() => deleteExercise(exercise.id)}
                        onDeleteSet={(setId) => deleteSet(exercise.id, setId)}
                        onAddSet={() => addSet(exercise.id)}
                        onUpdateSet={(setId, field, value) => updateSet(exercise.id, setId, field, value)}
                        onCompleteSet={(setId) => handleCompleteSet(exercise.id, setId)}
                        onUncompleteSet={(setId) => uncompleteSet(exercise.id, setId)}
                        onClearTimer={clearTimer}
                        onAdjustTimer={adjustTimer}
                        onExtendTimer={extendTimer}
                        onUpdateExerciseRest={(field, value) => updateExerciseRest(exercise.id, field, value)}
                        suggestion={getExerciseSuggestion(exercise) ?? undefined}
                        onOpenDetail={prog ? () => setSelectedExercise(prog) : undefined}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={() => setShowModal(true)}
              className="mt-4 w-full py-4 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-600 hover:text-zinc-400 font-semibold text-sm transition-colors"
            >
              <span className="inline-flex items-center gap-2"><LucidePlus size={14} /> Add Exercise</span>
            </button>

            {exercises.length > 0 && (
              <button
                onClick={() => setPendingExit("save")}
                className="mt-3 w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-sm tracking-widest uppercase transition-colors shadow-lg shadow-red-500/20"
              >
                End Workout
              </button>
            )}
          </>

        )}
      </main>

      {process.env.NODE_ENV === "development" && (
        <CoachTestPanel state={coachTest} onChange={setCoachTest} />
      )}

      {prFlash && (
        <PRToast
          key={`${prFlash.exerciseName}-${prFlash.value}`}
          type={prFlash.type}
          exerciseName={prFlash.exerciseName}
          value={prFlash.value}
          onDismiss={handlePrDismiss}
        />
      )}

      {momentumMessage && (
        <SessionMomentumToast
          key={momentumMessage}
          message={momentumMessage}
          onDismiss={() => setMomentumMessage(null)}
        />
      )}
    </>
  );
}
