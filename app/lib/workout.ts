import type {
  ExerciseSet,
  ExercisePrescription,
  SessionExercise,
  SetType,
  TemplateExercise,
  WorkoutSession,
  WorkoutHighlight,
} from "@/app/types";

export type PRRecord = { exerciseName: string; type: "e1rm" | "weight" };
import { calculate1RM } from "@/lib/analysis/calculate1RM";
import { getBaseExerciseName, getExerciseVariant } from "@/app/lib/exerciseVariant";

/** Returns only working sets — excludes Warm-up type. Use for non-metric purposes (e.g. weight pre-fill). */
export function getWorkingSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.type !== "Warm-up");
}

/**
 * Applies an active prescription to a set array, returning a new array.
 * Pure function — no side effects.
 *
 * Rules:
 * - Warm-up sets are never touched (type === "Warm-up").
 * - target_weight overrides working-set weight when not null.
 * - target_reps_min overrides working-set reps.
 * - target_sets adjusts the working-set count (add/remove from end).
 *   Warm-up count and order are preserved.
 * - Rest values, set types, and ordering are preserved.
 * - If prescription is undefined/null, returns the original array unchanged.
 */
export function applyPrescriptionToSets(
  sets: ExerciseSet[],
  prescription: ExercisePrescription | undefined,
): ExerciseSet[] {
  if (!prescription) return sets;

  const prescribedWeight =
    prescription.target_weight !== null ? String(prescription.target_weight) : null;
  const prescribedRepsMin = String(prescription.target_reps_min);

  // Override weight and reps on working sets only.
  let result = sets.map((s) => {
    if (s.type === "Warm-up") return s;
    return {
      ...s,
      ...(prescribedWeight !== null ? { weight: prescribedWeight } : {}),
      reps: prescribedRepsMin,
    };
  });

  // Adjust working-set count if prescription specifies one.
  if (prescription.target_sets !== null) {
    const warmupSets   = result.filter((s) => s.type === "Warm-up");
    const workingSets  = result.filter((s) => s.type !== "Warm-up");
    const targetCount  = prescription.target_sets;

    if (workingSets.length < targetCount) {
      // Clone last working set to fill up to targetCount.
      const template = workingSets[workingSets.length - 1];
      const extra: ExerciseSet[] = Array.from(
        { length: targetCount - workingSets.length },
        () => ({ ...template, id: crypto.randomUUID(), completed: false }),
      );
      result = [...warmupSets, ...workingSets, ...extra];
    } else if (workingSets.length > targetCount) {
      result = [...warmupSets, ...workingSets.slice(0, targetCount)];
    }
  }

  return result;
}

/**
 * Re-fills the open sets of an exercise after its variant was switched.
 * Pure function — no side effects.
 *
 * Rules:
 * - Completed sets are never touched.
 * - Open sets take weight and reps from `previous` — the most recent session
 *   exercise of the NEW variant — matched by set type and position within that
 *   type. Past the end of that type, the last set of the type is used.
 * - Without a matching previous set, weight and reps are cleared, so no value
 *   of the other variant survives the switch.
 * - The prescription (of the new variant) then overrides weight and reps on
 *   open working sets. target_sets is ignored.
 * - Set count, set types, rest values, and ordering are preserved.
 */
export function refillSetsForVariant(
  sets: ExerciseSet[],
  previous: Pick<SessionExercise, "sets"> | undefined,
  prescription?: ExercisePrescription,
): ExerciseSet[] {
  const previousByType: Partial<Record<SetType, ExerciseSet[]>> = {};
  for (const s of previous?.sets ?? []) {
    (previousByType[s.type] ??= []).push(s);
  }

  const typeCounter: Partial<Record<SetType, number>> = {};
  const refilled = sets.map((s) => {
    const nth = typeCounter[s.type] ?? 0;
    typeCounter[s.type] = nth + 1;
    if (s.completed) return s;

    const sameType = previousByType[s.type] ?? [];
    const source   = sameType[nth] ?? sameType[sameType.length - 1];
    return { ...s, weight: source?.weight ?? "", reps: source?.reps ?? "" };
  });

  if (!prescription) return refilled;

  const prescribed = applyPrescriptionToSets(
    refilled.filter((s) => !s.completed),
    { ...prescription, target_sets: null },
  );
  const prescribedById = new Map(prescribed.map((s) => [s.id, s]));
  return refilled.map((s) => prescribedById.get(s.id) ?? s);
}

/**
 * Carries variant switches made during a session over to its template, so the
 * exercise starts in the same variant next time. Pure function.
 *
 * Each template exercise is paired with one session exercise: first by exact
 * name, then — among what is left on both sides — by base name. A template
 * exercise paired by base name takes over the session exercise's name and
 * loses its startWeight when the variant flipped (it belongs to the other
 * variant). Exercises are never added, removed, or reordered.
 *
 * Returns null when the template needs no change.
 */
export function mergeSessionVariantsIntoTemplate(
  templateExercises: TemplateExercise[],
  sessionExercises: Pick<SessionExercise, "exerciseName">[],
): TemplateExercise[] | null {
  const unclaimed = sessionExercises.map((ex) => ex.exerciseName);
  const claim = (matches: (sessionName: string) => boolean): string | undefined => {
    const index = unclaimed.findIndex(matches);
    return index === -1 ? undefined : unclaimed.splice(index, 1)[0];
  };

  const exactlyMatched = templateExercises.map(
    (tpl) => claim((sessionName) => sessionName === tpl.name) !== undefined,
  );

  let changed = false;
  const result = templateExercises.map((tpl, i) => {
    if (exactlyMatched[i]) return tpl;

    const base        = getBaseExerciseName(tpl.name);
    const sessionName = claim((name) => getBaseExerciseName(name) === base);
    if (sessionName === undefined) return tpl;

    changed = true;
    const next: TemplateExercise = { ...tpl, name: sessionName };
    if (getExerciseVariant(sessionName) !== getExerciseVariant(tpl.name)) delete next.startWeight;
    return next;
  });

  return changed ? result : null;
}

/**
 * Builds the TemplateExercise[] to write back when the user confirms
 * "Update Plan". Spreads the original template exercise as base (preserving
 * targetRepsMin/Max, startWeight, targetReps) then overlays only the fields
 * that SessionExercise can safely provide. Pure function.
 *
 * Matching uses the exercise name (TemplateExercise has no stable id field):
 * exact name first, then base name, so an exercise whose variant was switched
 * during the session keeps its template settings. Its startWeight is dropped
 * in that case — it belongs to the other variant.
 */
export function buildStructuralTemplateExercises(
  sessionExercises: SessionExercise[],
  originals: TemplateExercise[],
): TemplateExercise[] {
  return sessionExercises.map((ex) => {
    const original =
      originals.find((o) => o.name === ex.exerciseName) ??
      originals.find((o) => getBaseExerciseName(o.name) === getBaseExerciseName(ex.exerciseName));
    const base: Partial<TemplateExercise> = { ...original };
    if (original && getExerciseVariant(original.name) !== getExerciseVariant(ex.exerciseName)) delete base.startWeight;
    return {
      ...base,
      name:         ex.exerciseName,
      muscleGroups: ex.muscleGroups,
      notes:        ex.notes,
      sets:         ex.sets.length,
    };
  });
}

/** Returns sets that count toward metrics: completed and not a warm-up. Single source of truth for all calculations. */
export function getEffectiveSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.completed === true && s.type !== "Warm-up");
}

/** Returns all completed sets regardless of type. Use for display in history views (warm-ups included). */
export function getCompletedSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.completed === true);
}

/** Sum of weight × reps across effective sets only (completed, non-warm-up). */
export function computeVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, e) =>
      total +
      getEffectiveSets(e.sets).reduce((s, set) => {
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps) || 0;
        return s + w * r;
      }, 0),
    0
  );
}

/** "45 min" / "1h 10m" / "—" */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "4,820 kg" / "—" */
export function formatVolume(kg: number): string {
  if (kg <= 0) return "—";
  return `${Math.round(kg).toLocaleString()} kg`;
}

/**
 * Finds the best set in a session using the Epley estimated 1RM formula:
 *   estimated1RM = weight × (1 + reps / 30)
 *
 * This correctly handles cases where a lighter but higher-rep set outscores
 * a heavier, lower-rep set. Returns null when no set has valid weight+reps.
 */
export function computeWorkoutHighlight(session: WorkoutSession): WorkoutHighlight | null {
  let best: WorkoutHighlight | null = null;
  let bestScore = 0;

  for (const exercise of session.exercises) {
    for (const set of getEffectiveSets(exercise.sets)) {
      const w = parseFloat(set.weight) || 0;
      const r = parseFloat(set.reps)   || 0;
      if (w <= 0 || r <= 0) continue;

      const e1rm = calculate1RM(w, r);
      if (e1rm > bestScore) {
        bestScore = e1rm;
        best = {
          exerciseName: exercise.exerciseName,
          weight:       w,
          reps:         r,
          estimated1RM: Math.round(e1rm * 10) / 10,
        };
      }
    }
  }

  return best;
}

/**
 * Computes average e1RM delta between this session and the most recent prior
 * session for each exercise. Returns null if no exercises have prior data.
 * priorHistory must be newest-first (i.e. history.slice(1) after saving).
 */
export function computeStrengthDelta(
  session: WorkoutSession,
  priorHistory: WorkoutSession[],
): number | null {
  const deltas: number[] = [];

  for (const ex of session.exercises) {
    const effectiveSets = getEffectiveSets(ex.sets);
    if (effectiveSets.length === 0) continue;

    const thisE1rm = effectiveSets.reduce((best, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseFloat(s.reps) || 0;
      return Math.max(best, calculate1RM(w, r));
    }, 0);
    if (thisE1rm === 0) continue;

    // Most recent prior session that contains this exercise
    const priorSession = priorHistory.find((w) =>
      w.exercises.some((e) => e.exerciseName === ex.exerciseName),
    );
    if (!priorSession) continue;

    const priorE1rm = priorSession.exercises
      .filter((e) => e.exerciseName === ex.exerciseName)
      .flatMap((e) => getEffectiveSets(e.sets))
      .reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseFloat(s.reps) || 0;
        return Math.max(best, calculate1RM(w, r));
      }, 0);
    if (priorE1rm === 0) continue;

    deltas.push((thisE1rm - priorE1rm) / priorE1rm);
  }

  if (deltas.length === 0) return null;
  return Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 100);
}

/**
 * Pure function that returns true when the current session's exercise structure
 * differs from the materialized snapshot captured at session start.
 *
 * The snapshot (originalExerciseStructure) is stored on WorkoutSession when a
 * plan-based workout starts and reflects the actual set counts and types after
 * history-restore and prescription overrides — not the raw template definition.
 * This prevents false positives when prior sessions had already produced a
 * structure that differs from the template.
 *
 * Detects:
 * - Exercise list changes: added, removed, replaced, or reordered exercises.
 * - Set count changes per exercise.
 * - Set type sequence changes per exercise (Normal / Warm-up / Drop Set).
 *
 * Does NOT trigger on:
 * - Weight or reps values (logged performance data).
 * - Completion flags or timestamps.
 * - Rest seconds.
 * - Transient UI state (IDs, notes edits).
 * - A variant switch (bilateral ↔ unilateral) — carried over to the template
 *   separately, see mergeSessionVariantsIntoTemplate.
 *
 * Returns false when the session was not started from a template (no snapshot).
 */
export function hasStructureChanged(session: WorkoutSession): boolean {
  const snapshot = session.originalExerciseStructure;
  if (!snapshot || snapshot.length === 0) return false;

  const current = session.exercises;

  // Exercise count or order/name mismatch.
  if (snapshot.length !== current.length) return true;
  for (let i = 0; i < snapshot.length; i++) {
    if (getBaseExerciseName(snapshot[i].exerciseName) !== getBaseExerciseName(current[i].exerciseName)) return true;
  }

  // Per-exercise: set count and set type sequence.
  for (let i = 0; i < snapshot.length; i++) {
    if (snapshot[i].setCount !== current[i].sets.length) return true;

    const snapTypes = snapshot[i].setTypes;
    const currTypes = current[i].sets.map((s) => s.type);
    if (snapTypes.length !== currTypes.length) return true;
    for (let j = 0; j < snapTypes.length; j++) {
      if (snapTypes[j] !== currTypes[j]) return true;
    }
  }

  return false;
}
