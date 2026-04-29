"use client";

/**
 * PrescriptionQAPanel — DEV ONLY.
 *
 * Debugging/inspection tool for the exercise_prescriptions flow.
 * Rendered only when process.env.NODE_ENV === "development".
 *
 * Uses real hook methods from usePrescriptions and useWorkout — no mocking.
 * All state is local to this component.
 */

import { useState, useEffect, useRef } from "react";
import type { ExerciseRecommendationAction, WorkoutSession, ExercisePrescription } from "@/app/types";
import type { AcceptPrescriptionParams } from "@/app/hooks/usePrescriptions";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionHookApi {
  prescriptions: ExercisePrescription[];
  getPrescription: (exerciseName: string) => ExercisePrescription | undefined;
  acceptPrescription: (params: AcceptPrescriptionParams) => Promise<void>;
  consumePrescriptions: (exerciseNames: string[]) => Promise<void>;
  clearPrescription: (exerciseName: string) => Promise<void>;
}

interface Props {
  userId: string | null;
  prescriptionApi: PrescriptionHookApi;
  activeWorkout: WorkoutSession | null;
}

// ─── Action options ───────────────────────────────────────────────────────────

const ACTION_OPTIONS: ExerciseRecommendationAction[] = [
  "increase_load",
  "increase_reps",
  "hold",
  "reduce_load",
  "deload",
  "form_focus",
  "new",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionQAPanel({ userId, prescriptionApi, activeWorkout }: Props) {
  const [open, setOpen] = useState(false);

  // Section A — form state
  const [exerciseName, setExerciseName] = useState("");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [targetRepsMin, setTargetRepsMin] = useState<string>("8");
  const [targetRepsMax, setTargetRepsMax] = useState<string>("12");
  const [targetSets, setTargetSets] = useState<string>("");
  const [action, setAction] = useState<ExerciseRecommendationAction>("increase_load");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [reason, setReason] = useState<string>("");

  // Section C — save/consume log
  const [eventLog, setEventLog] = useState<string[]>([]);
  const prevPrescriptionsRef = useRef<ExercisePrescription[]>([]);


  // Section D — consumed count (fetched on demand)
  const [consumedCount, setConsumedCount] = useState<number | null>(null);

  const ts = () => new Date().toLocaleTimeString();

  const appendLog = (entry: string) => {
    setEventLog((prev) => [entry, ...prev].slice(0, 50));
  };

  // Track prescription changes for Section C observation
  useEffect(() => {
    const prev = prevPrescriptionsRef.current;
    const curr = prescriptionApi.prescriptions;

    if (prev.length > 0 && curr.length < prev.length) {
      const disappeared = prev.filter(
        (p) => !curr.find((c) => c.exercise_name === p.exercise_name),
      );
      if (disappeared.length > 0) {
        const names = disappeared.map((p) => p.exercise_name).join(", ");
        appendLog(`[${ts()}] Prescriptions consumed/cleared — removed: ${names}`);
        appendLog(`[${ts()}] Active prescriptions remaining: ${curr.length}`);
      }
    } else if (curr.length > prev.length) {
      const added = curr.filter(
        (c) => !prev.find((p) => p.exercise_name === c.exercise_name),
      );
      if (added.length > 0) {
        const names = added.map((p) => p.exercise_name).join(", ");
        appendLog(`[${ts()}] New prescription accepted — exercise: ${names}`);
      }
    }

    prevPrescriptionsRef.current = curr;
  }, [prescriptionApi.prescriptions]);

  // ── Section A actions ─────────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!exerciseName.trim()) return;
    const repsMin = parseInt(targetRepsMin, 10);
    const repsMax = parseInt(targetRepsMax, 10);
    if (isNaN(repsMin) || isNaN(repsMax)) {
      appendLog(`[${ts()}] ERROR: reps_min and reps_max must be numbers`);
      return;
    }
    appendLog(`[${ts()}] acceptPrescription called — exercise: ${exerciseName}`);
    await prescriptionApi.acceptPrescription({
      exercise_name: exerciseName.trim(),
      target_weight: targetWeight !== "" ? parseFloat(targetWeight) : null,
      target_reps_min: repsMin,
      target_reps_max: repsMax,
      target_sets: targetSets !== "" ? parseInt(targetSets, 10) : null,
      action,
      confidence,
      reason: reason || undefined,
    });
    appendLog(`[${ts()}] acceptPrescription resolved`);
  };

  const handleConsume = async () => {
    if (!exerciseName.trim()) return;
    appendLog(`[${ts()}] consumePrescriptions called — exercise: ${exerciseName}`);
    await prescriptionApi.consumePrescriptions([exerciseName.trim()]);
    appendLog(`[${ts()}] consumePrescriptions resolved`);
  };

  const handleClear = async () => {
    if (!exerciseName.trim()) return;
    appendLog(`[${ts()}] clearPrescription called — exercise: ${exerciseName}`);
    await prescriptionApi.clearPrescription(exerciseName.trim());
    appendLog(`[${ts()}] clearPrescription resolved`);
  };

  // ── Section D scenario handlers ───────────────────────────────────────────

  const scenarioNoPrescription = async () => {
    if (!exerciseName.trim()) return;
    appendLog(`[${ts()}] SCENARIO: No prescription — clearing ${exerciseName}`);
    await prescriptionApi.clearPrescription(exerciseName.trim());
  };

  const scenarioWeightRepsOverride = async () => {
    if (!exerciseName.trim()) return;
    setTargetWeight("80");
    setTargetRepsMin("8");
    setTargetRepsMax("10");
    setAction("increase_load");
    setConfidence("high");
    setTargetSets("");
    appendLog(`[${ts()}] SCENARIO: Weight+Reps override — accepting for ${exerciseName}`);
    await prescriptionApi.acceptPrescription({
      exercise_name: exerciseName.trim(),
      target_weight: 80,
      target_reps_min: 8,
      target_reps_max: 10,
      target_sets: null,
      action: "increase_load",
      confidence: "high",
    });
    appendLog(`[${ts()}] SCENARIO: Weight+Reps override accepted`);
  };

  const scenarioSetsOverride = async () => {
    if (!exerciseName.trim()) return;
    setTargetSets("4");
    setAction("reduce_load");
    setConfidence("medium");
    appendLog(`[${ts()}] SCENARIO: Sets override — accepting target_sets=4 for ${exerciseName}`);
    await prescriptionApi.acceptPrescription({
      exercise_name: exerciseName.trim(),
      target_weight: targetWeight !== "" ? parseFloat(targetWeight) : null,
      target_reps_min: parseInt(targetRepsMin, 10) || 8,
      target_reps_max: parseInt(targetRepsMax, 10) || 12,
      target_sets: 4,
      action: "reduce_load",
      confidence: "medium",
    });
    appendLog(`[${ts()}] SCENARIO: Sets override accepted`);
  };

  const scenarioAlreadyConsumed = async () => {
    if (!exerciseName.trim()) return;
    appendLog(`[${ts()}] SCENARIO: Already consumed — consuming ${exerciseName}`);
    await prescriptionApi.consumePrescriptions([exerciseName.trim()]);
    appendLog(`[${ts()}] SCENARIO: consumed, active prescription should now be gone`);
  };

  const scenarioReAccept = async () => {
    if (!exerciseName.trim()) return;
    appendLog(`[${ts()}] SCENARIO: Re-accept/replace — accepting twice rapidly`);
    const p1 = prescriptionApi.acceptPrescription({
      exercise_name: exerciseName.trim(),
      target_weight: 75,
      target_reps_min: 6,
      target_reps_max: 8,
      target_sets: null,
      action: "hold",
      confidence: "low",
      reason: "first accept",
    });
    const p2 = prescriptionApi.acceptPrescription({
      exercise_name: exerciseName.trim(),
      target_weight: 80,
      target_reps_min: 8,
      target_reps_max: 10,
      target_sets: null,
      action: "increase_load",
      confidence: "high",
      reason: "second accept — should win",
    });
    await Promise.all([p1, p2]);
    appendLog(`[${ts()}] SCENARIO: Re-accept/replace done — check: only ONE prescription should exist`);
  };

  const scenarioShowConsumedCount = async () => {
    if (!userId) {
      appendLog(`[${ts()}] SCENARIO: Show consumed count — no userId`);
      return;
    }
    appendLog(`[${ts()}] SCENARIO: Querying consumed prescription count...`);
    const supabase = createClient();
    const { count, error } = await supabase
      .from("exercise_prescriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("consumed_at", "is", null);

    if (error) {
      appendLog(`[${ts()}] SCENARIO: query error — ${error.message}`);
      return;
    }
    const result = count ?? 0;
    setConsumedCount(result);
    appendLog(`[${ts()}] SCENARIO: consumed prescriptions total = ${result}`);
  };

  // ── Derived display data ──────────────────────────────────────────────────

  const activePrescription = exerciseName.trim()
    ? prescriptionApi.getPrescription(exerciseName.trim())
    : undefined;

  // Section B: per-exercise prefill debug data derived from activeWorkout.
  // NOTE: "prescription found?" reflects the LIVE prescription state, not what
  // was active at workout-start time. Accept the prescription BEFORE starting the
  // workout to get an accurate reading.
  const prefillDebugRows = (activeWorkout?.exercises ?? []).map((ex) => {
    const prescription = prescriptionApi.getPrescription(ex.exerciseName);
    const warmupSets = ex.sets.filter((s) => s.type === "Warm-up");
    const workingSets = ex.sets.filter((s) => s.type !== "Warm-up");
    const firstWorking = workingSets[0];
    return {
      exerciseName: ex.exerciseName,
      prescriptionFound: prescription !== undefined,
      prescriptionAction: prescription?.action ?? null,
      prescriptionWeight: prescription?.target_weight ?? null,
      prescriptionRepsMin: prescription?.target_reps_min ?? null,
      prefillWeight: firstWorking?.weight ?? null,
      prefillReps: firstWorking?.reps ?? null,
      workingSetCount: workingSets.length,
      warmupSetCount: warmupSets.length,
      warmupWeight: warmupSets[0]?.weight ?? null,
    };
  });

  if (!open) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="bg-yellow-500 text-black text-xs font-mono font-bold px-3 py-1 rounded border border-yellow-300"
        >
          Prescription QA
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 text-green-400 font-mono text-xs p-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-green-800 pb-2">
          <span className="text-green-300 font-bold text-sm">PRESCRIPTION QA PANEL [DEV]</span>
          <button
            onClick={() => setOpen(false)}
            className="text-red-400 hover:text-red-200 text-sm font-bold"
          >
            [CLOSE]
          </button>
        </div>

        <div className="text-yellow-500 text-xs">
          userId: {userId ?? "(null)"} | active prescriptions: {prescriptionApi.prescriptions.length}
        </div>

        {/* ── SECTION A — Prescription Controls ─────────────────────────── */}
        <section>
          <div className="text-green-300 font-bold mb-2">A — PRESCRIPTION CONTROLS</div>
          <div className="border border-green-900 p-3 space-y-3">

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">exercise_name</label>
              <input
                type="text"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="e.g. Bench Press"
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-64 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">target_weight</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="null"
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-32 focus:outline-none focus:border-green-500"
              />
              <span className="text-green-700">nullable</span>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">target_reps_min</label>
              <input
                type="number"
                value={targetRepsMin}
                onChange={(e) => setTargetRepsMin(e.target.value)}
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-24 focus:outline-none focus:border-green-500"
              />
              <label className="text-green-600 ml-4">target_reps_max</label>
              <input
                type="number"
                value={targetRepsMax}
                onChange={(e) => setTargetRepsMax(e.target.value)}
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-24 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">target_sets</label>
              <input
                type="number"
                value={targetSets}
                onChange={(e) => setTargetSets(e.target.value)}
                placeholder="null"
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-24 focus:outline-none focus:border-green-500"
              />
              <span className="text-green-700">nullable</span>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ExerciseRecommendationAction)}
                className="bg-black border border-green-800 text-green-300 px-2 py-1 focus:outline-none focus:border-green-500"
              >
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">confidence</label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as "low" | "medium" | "high")}
                className="bg-black border border-green-800 text-green-300 px-2 py-1 focus:outline-none focus:border-green-500"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-green-600 w-32 shrink-0">reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="optional"
                className="bg-black border border-green-800 text-green-300 px-2 py-1 w-64 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              <button
                onClick={handleAccept}
                className="bg-green-900 border border-green-600 text-green-200 px-3 py-1 hover:bg-green-800"
              >
                Create / Replace
              </button>
              <button
                onClick={handleConsume}
                className="bg-yellow-900 border border-yellow-600 text-yellow-200 px-3 py-1 hover:bg-yellow-800"
              >
                Mark Consumed
              </button>
              <button
                onClick={handleClear}
                className="bg-red-900 border border-red-600 text-red-200 px-3 py-1 hover:bg-red-800"
              >
                Clear
              </button>
            </div>

            {/* Active prescription display */}
            <div className="mt-3 border-t border-green-900 pt-3">
              <div className="text-green-600 mb-1">
                Active prescription for &quot;{exerciseName || "(enter exercise name)"}&quot;:
              </div>
              {activePrescription ? (
                <pre className="text-green-300 text-xs whitespace-pre-wrap break-all bg-black/50 p-2 border border-green-900">
                  {JSON.stringify(activePrescription, null, 2)}
                </pre>
              ) : (
                <div className="text-red-400 text-xs">
                  {exerciseName.trim() ? "No active prescription found" : "Enter exercise name above"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION B — Prefill Debug Visibility ──────────────────────── */}
        <section>
          <div className="text-green-300 font-bold mb-2">B — PREFILL DEBUG (active workout)</div>
          <div className="text-yellow-600 text-xs mb-1">
            WARNING: &quot;prescription found?&quot; reflects the LIVE prescription state, not what was
            active at workout-start time. Accept the prescription BEFORE starting the workout to
            get a valid reading.
          </div>
          <div className="border border-green-900 p-3">
            {!activeWorkout ? (
              <div className="text-yellow-600">
                No active workout. Start a workout first, then this section shows the prefill result
                alongside the prescription that was active at start time.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-green-700">
                  Session: {activeWorkout.name} | exercises: {activeWorkout.exercises.length}
                </div>
                {prefillDebugRows.map((row) => (
                  <div key={row.exerciseName} className="border border-green-900/50 p-2 space-y-1">
                    <div className="text-green-200 font-bold">{row.exerciseName}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                      <span className="text-green-700">prescription found?</span>
                      <span className={row.prescriptionFound ? "text-green-300" : "text-red-400"}>
                        {String(row.prescriptionFound)}
                      </span>

                      {row.prescriptionFound && (
                        <>
                          <span className="text-green-700">prescription action</span>
                          <span className="text-green-300">{row.prescriptionAction}</span>
                          <span className="text-green-700">prescription weight</span>
                          <span className="text-green-300">{row.prescriptionWeight ?? "null (no override)"}</span>
                          <span className="text-green-700">prescription reps_min</span>
                          <span className="text-green-300">{row.prescriptionRepsMin}</span>
                        </>
                      )}

                      <span className="text-green-700">prefill weight (1st working)</span>
                      <span className="text-green-300">{row.prefillWeight ?? "—"}</span>
                      <span className="text-green-700">prefill reps (1st working)</span>
                      <span className="text-green-300">{row.prefillReps ?? "—"}</span>
                      <span className="text-green-700">working set count</span>
                      <span className="text-green-300">{row.workingSetCount}</span>
                      <span className="text-green-700">warmup set count</span>
                      <span className="text-green-300">{row.warmupSetCount}</span>
                      {row.warmupSetCount > 0 && (
                        <>
                          <span className="text-green-700">warmup weight</span>
                          <span className="text-green-300">{row.warmupWeight ?? "—"}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION C — Save/Consume Debug Log ────────────────────────── */}
        <section>
          <div className="text-green-300 font-bold mb-2">C — EVENT LOG</div>
          <div className="border border-green-900 p-3">
            <div className="text-green-700 mb-2 text-xs">
              Observe prescription state changes here. Trigger saves from the main UI and watch
              for consume events. Log is capped at 50 entries.
            </div>
            <div className="text-green-600 mb-1">
              Current active prescriptions ({prescriptionApi.prescriptions.length}):
            </div>
            {prescriptionApi.prescriptions.length === 0 ? (
              <div className="text-red-400 mb-2">none</div>
            ) : (
              <div className="mb-2 space-y-0.5">
                {prescriptionApi.prescriptions.map((p) => (
                  <div key={p.id} className="text-green-300">
                    {p.exercise_name} | {p.action} | w={p.target_weight ?? "null"} r={p.target_reps_min}-{p.target_reps_max} | accepted: {new Date(p.accepted_at).toLocaleTimeString()}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-green-900 pt-2 mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-600">Event log (newest first):</span>
                <button
                  onClick={() => setEventLog([])}
                  className="text-red-600 hover:text-red-400 text-xs"
                >
                  [clear log]
                </button>
              </div>
              {eventLog.length === 0 ? (
                <div className="text-green-900">no events yet</div>
              ) : (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {eventLog.map((entry, i) => (
                    <div key={i} className="text-green-400 whitespace-pre-wrap">{entry}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION D — Scenario Quick-Buttons ────────────────────────── */}
        <section>
          <div className="text-green-300 font-bold mb-2">D — SCENARIOS</div>
          <div className="border border-green-900 p-3 space-y-3">
            <div className="text-green-700 text-xs mb-2">
              Exercise name from Section A is used. Set it first.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={scenarioNoPrescription}
                className="bg-gray-900 border border-gray-600 text-gray-300 px-3 py-1 hover:bg-gray-800 text-xs"
              >
                1. No prescription
              </button>
              <button
                onClick={scenarioWeightRepsOverride}
                className="bg-blue-900 border border-blue-600 text-blue-200 px-3 py-1 hover:bg-blue-800 text-xs"
              >
                2. Weight+Reps override
              </button>
              <button
                onClick={scenarioSetsOverride}
                className="bg-purple-900 border border-purple-600 text-purple-200 px-3 py-1 hover:bg-purple-800 text-xs"
              >
                3. Sets override
              </button>
              <button
                onClick={scenarioAlreadyConsumed}
                className="bg-yellow-900 border border-yellow-600 text-yellow-200 px-3 py-1 hover:bg-yellow-800 text-xs"
              >
                4. Already consumed
              </button>
              <button
                onClick={scenarioReAccept}
                className="bg-orange-900 border border-orange-600 text-orange-200 px-3 py-1 hover:bg-orange-800 text-xs"
              >
                5. Re-accept/replace
              </button>
              <button
                onClick={scenarioShowConsumedCount}
                className="bg-teal-900 border border-teal-600 text-teal-200 px-3 py-1 hover:bg-teal-800 text-xs"
              >
                6. Show consumed count
              </button>
            </div>

            {consumedCount !== null && (
              <div className="text-teal-300 border border-teal-900 px-2 py-1 text-xs">
                Consumed prescriptions total (all time, this user): {consumedCount}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
