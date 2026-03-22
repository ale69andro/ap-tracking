"use client";

import { useState } from "react";
import ExerciseCard from "./components/ExerciseCard";
import ProgressionCard from "./components/ProgressionCard";
import ExerciseDetailSheet from "./components/ExerciseDetailSheet";
import WorkoutTimer from "./components/WorkoutTimer";
import TemplatesSheet from "./components/TemplatesSheet";
import WorkoutDetailSheet from "./components/WorkoutDetailSheet";
import WorkoutSummaryScreen from "./components/WorkoutSummaryScreen";
import HistoryScreen from "./components/HistoryScreen";
import ProgressScreen from "./components/ProgressScreen";
import { useWorkout, getSessionDate } from "./hooks/useWorkout";
import { getEffectiveSets } from "./lib/workout";
import { useProgression } from "./hooks/useProgression";
import { useTemplates } from "./hooks/useTemplates";
import { useAuth } from "./hooks/useAuth";
import { useExerciseLibrary } from "./hooks/useExerciseLibrary";
import AddExerciseModal from "./components/AddExerciseModal";
import ConfirmModal from "./components/ConfirmModal";
import { PRESET_TEMPLATES } from "./constants/presetTemplates";
import { DEMO_WORKOUTS } from "./constants/demoData";
import { ANALYSIS_TEST_WORKOUTS } from "./constants/analysisTestData";
import type { ExerciseProgression, WorkoutSession, WorkoutTemplate } from "./types";

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab]                       = useState<"home" | "history" | "progress">("home");
  const [showModal, setShowModal]           = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseProgression | null>(null);
  const [historySource, setHistorySource]   = useState<"real" | "demo" | "test">("real");
  const [showTemplates, setShowTemplates]   = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isEditingName, setIsEditingName]   = useState(false);
  const [pendingExit, setPendingExit]   = useState<"discard" | "save" | null>(null);
  const [confirming, setConfirming]     = useState(false);

  const { user, loading: authLoading, signOut } = useAuth();
  const userId = user?.id ?? null;

  const {
    activeWorkout,
    completedSession,
    history,
    activeTimer,
    addExercise,
    deleteExercise,
    moveExercise,
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

  const workoutActive = activeWorkout !== null;
  const exercises     = activeWorkout?.exercises ?? [];

  const { templates, saveTemplate, deleteTemplate } = useTemplates(userId);
  const { userExercises, createUserExercise } = useExerciseLibrary(userId);

  const effectiveHistory =
    historySource === "demo"  ? [...DEMO_WORKOUTS, ...history] :
    historySource === "test"  ? ANALYSIS_TEST_WORKOUTS :
    history;
  const progressions     = useProgression(effectiveHistory);

  const handleAddExercise = (name: string, muscleGroups: string[]) => {
    addExercise(name, muscleGroups);
    setShowModal(false);
  };

  const handleCreateCustomExercise = async (name: string, muscleGroups: string[]) => {
    console.log("🔥 HANDLE CREATE CUSTOM CALLED");
    // Throws on DB error — AddExerciseModal catches and shows the error to the user.
    await createUserExercise(name, muscleGroups);
    addExercise(name, muscleGroups);
    setShowModal(false);
  };

  const handleStartFromTemplate = (template: WorkoutTemplate) => {
    startWorkout(template.name, template.id, template.exercises);
    setShowTemplates(false);
  };

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

  if (authLoading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <>
      {showModal && (
        <AddExerciseModal
          userExercises={userExercises}
          onAdd={handleAddExercise}
          onCreateCustom={handleCreateCustomExercise}
          onClose={() => setShowModal(false)}
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
          onSave={saveTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowTemplates(false)}
          onCreateCustom={createUserExercise}
        />
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
          <ProgressScreen progressions={progressions} onTapExercise={setSelectedExercise} />

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
                onClick={signOut}
                className="text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors py-1.5 px-3 rounded-xl hover:bg-zinc-800 mt-1"
              >
                Sign out
              </button>
            </header>

            <button
              onClick={() => startWorkout()}
              className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase transition-all shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:shadow-[0_0_36px_rgba(239,68,68,0.5)] mb-4"
            >
              + Start Workout
            </button>

            <button
              onClick={() => setShowTemplates(true)}
              className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 mb-10 hover:border-zinc-700 transition-colors"
            >
              <span className="text-sm font-semibold text-zinc-400">Templates</span>
              <span className="text-xs text-zinc-600">
                {templates.length > 0 ? `${templates.length} saved →` : "Create one →"}
              </span>
            </button>

            {/* Progression */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Progression</h2>
                <div className="flex items-center gap-2">
                  {progressions.length > 0 && (
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                      {progressions.length} exercise{progressions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    onClick={() => setHistorySource((s) => s === "real" ? "demo" : s === "demo" ? "test" : "real")}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      historySource === "demo" ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400" :
                      historySource === "test" ? "border-amber-500/60 bg-amber-500/15 text-amber-400" :
                      "border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {historySource === "demo" ? "● Demo" : historySource === "test" ? "● Test" : "Demo"}
                  </button>
                </div>
              </div>
              {progressions.length > 0 ? (
                <div className="space-y-3">
                  {progressions.map((p) => (
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
            <div className="space-y-3">
              {exercises.map((exercise, idx) => {
                const prog = progressions.find((p) => p.name === exercise.exerciseName);
                const lastSessions = prog?.recentSessions ?? [];
                const lastSess = lastSessions.length > 0 ? lastSessions[lastSessions.length - 1] : undefined;
                return (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    activeTimer={activeTimer}
                    lastSession={lastSess ? { topWeight: lastSess.topWeight, topReps: lastSess.topReps } : undefined}
                    onDelete={() => deleteExercise(exercise.id)}
                    onDeleteSet={(setId) => deleteSet(exercise.id, setId)}
                    onAddSet={() => addSet(exercise.id)}
                    onUpdateSet={(setId, field, value) => updateSet(exercise.id, setId, field, value)}
                    onCompleteSet={(setId) => completeSet(exercise.id, setId)}
                    onUncompleteSet={(setId) => uncompleteSet(exercise.id, setId)}
                    onClearTimer={clearTimer}
                    onAdjustTimer={adjustTimer}
                    onUpdateExerciseRest={(field, value) => updateExerciseRest(exercise.id, field, value)}
                    onMoveUp={idx > 0 ? () => moveExercise(exercise.id, "up") : undefined}
                    onMoveDown={idx < exercises.length - 1 ? () => moveExercise(exercise.id, "down") : undefined}
                  />
                );
              })}
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="mt-4 w-full py-4 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-600 hover:text-zinc-400 font-semibold text-sm transition-colors"
            >
              + Add Exercise
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
    </>
  );
}
