"use client";

import { useState, useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ExerciseCard from "./components/ExerciseCard";
import ProgressionCard from "./components/ProgressionCard";
import ExerciseDetailSheet from "./components/ExerciseDetailSheet";
import WorkoutTimer from "./components/WorkoutTimer";
import TemplatesSheet from "./components/TemplatesSheet";
import WorkoutDetailSheet from "./components/WorkoutDetailSheet";
import WorkoutSummaryScreen from "./components/WorkoutSummaryScreen";
import HistoryScreen from "./components/HistoryScreen";
import ProgressScreen from "./components/ProgressScreen";
import ProfileSetupScreen from "./components/ProfileSetupScreen";
import ProfileEditSheet from "./components/ProfileEditSheet";
import { useWorkout, getSessionDate } from "./hooks/useWorkout";
import { useProfile } from "./hooks/useProfile";
import { getEffectiveSets } from "./lib/workout";
import { useProgression } from "./hooks/useProgression";
import { useTemplates } from "./hooks/useTemplates";
import { useAuth } from "./hooks/useAuth";
import { useExerciseLibrary } from "./hooks/useExerciseLibrary";
import { useTrainingPlan } from "./hooks/useTrainingPlan";
import { useScrollLock } from "./hooks/useScrollLock";
import AddExerciseModal from "./components/AddExerciseModal";
import ConfirmModal from "./components/ConfirmModal";
import TrainingDayCard from "./components/TrainingDayCard";
import TrainingPlanSheet from "./components/TrainingPlanSheet";
import { computeMuscleGroupLoadMap } from "@/lib/analysis/smartCoach";
import { getTrainingDayHint } from "@/app/lib/trainingDayHint";
import { COACH_TEST_SCENARIOS, COACH_TEST_INITIAL } from "./constants/coachTestScenarios";
import type { CoachTestState } from "./constants/coachTestScenarios";
import CoachTestPanel from "./components/CoachTestPanel";
import { PRESET_TEMPLATES } from "./constants/presetTemplates";
import type { Equipment, ExerciseProgression, SessionExercise, ExerciseSet, ActiveTimer, TemplateExercise, TrainingDay, WorkoutSession, WorkoutTemplate } from "./types";
import { getExerciseTargets, parseMiddleRep } from "@/lib/analysis/getExerciseTargets";
import { useEffect } from "react";
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
  onUpdateExerciseRest: (field: "warmupRestSeconds" | "workingRestSeconds", value: number) => void;
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

export default function Home() {
  const [tab, setTab]                       = useState<"home" | "history" | "progress">("home");
  const [showModal, setShowModal]           = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseProgression | null>(null);
  const [showTemplates, setShowTemplates]   = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isEditingName, setIsEditingName]   = useState(false);
  const [pendingExit, setPendingExit]     = useState<"discard" | "save" | null>(null);
  const [confirming, setConfirming]       = useState(false);
  const [showProfileSheet, setShowProfileSheet]   = useState(false);
  const [showTrainingPlan, setShowTrainingPlan]   = useState(false);
  const [planDraftDays, setPlanDraftDays]         = useState<TrainingDay[]>([]);
  const [pendingTemplateDayId, setPendingTemplateDayId] = useState<string | null>(null);
  const [coachTest, setCoachTest] = useState<CoachTestState>(COACH_TEST_INITIAL);

  const { user, loading: authLoading, signOut } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading, saveProfile } = useProfile(userId);

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
    dismissSummary,
  } = useWorkout(userId);

  // Lock body scroll whenever any sheet or modal overlay is visible.
  // Must be after useWorkout so completedSession is initialised.
  useScrollLock(
    showModal        ||
    showTemplates    ||
    showTrainingPlan ||
    showProfileSheet ||
    !!selectedExercise ||
    !!selectedWorkout  ||
    !!pendingExit      ||
    !!completedSession
  );

  const workoutActive = activeWorkout !== null;
  const exercises     = activeWorkout?.exercises ?? [];

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

  const progressions = useProgression(history);

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
  const nextDayTemplateName = nextDay?.templateId
    ? allTemplatesForDisplay.find((t) => t.id === nextDay.templateId)?.name
    : undefined;
  const lastDayTemplateName = lastCompletedDay?.templateId
    ? allTemplatesForDisplay.find((t) => t.id === lastCompletedDay.templateId)?.name
    : undefined;

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
    try {
      if (pendingExit === "save") await saveWorkout();
      else resetWorkout();
      setPendingExit(null);
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
        <ExerciseDetailSheet progression={selectedExercise} onClose={() => setSelectedExercise(null)} />
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
          description={pendingExit === "save" ? "Your workout will be saved." : "Your progress will be lost."}
          confirmLabel={pendingExit === "save" ? "Finish workout" : "End workout"}
          cancelLabel="Stay"
          loadingLabel={pendingExit === "save" ? "Saving..." : "Ending..."}
          loading={confirming}
          onConfirm={handleConfirmExit}
          onCancel={() => setPendingExit(null)}
        />
      )}

      {completedSession && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
          <WorkoutSummaryScreen session={completedSession} onDone={dismissSummary} />
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
          <ProgressScreen progressions={effectiveProgressions} onTapExercise={setSelectedExercise} profile={effectiveProfile ?? undefined} />

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
              <button
                onClick={() => setShowProfileSheet(true)}
                className="w-9 h-9 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-sm font-black text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors mt-1"
              >
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </button>
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
              nextDayTemplateName={nextDayTemplateName}
              lastCompletedDay={lastCompletedDay}
              lastCompletedAt={lastCompletedAt}
              lastDayTemplateName={lastDayTemplateName}
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
                        onCompleteSet={(setId) => completeSet(exercise.id, setId)}
                        onUncompleteSet={(setId) => uncompleteSet(exercise.id, setId)}
                        onClearTimer={clearTimer}
                        onAdjustTimer={adjustTimer}
                        onUpdateExerciseRest={(field, value) => updateExerciseRest(exercise.id, field, value)}
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
    </>
  );
}
