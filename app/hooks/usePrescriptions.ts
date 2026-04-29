"use client";

import { useState, useEffect, useRef } from "react";
import type { ExercisePrescription, ExerciseRecommendationAction } from "@/app/types";
import { createClient } from "@/lib/supabase/client";

// ─── Supabase row mapper ──────────────────────────────────────────────────────

type PrescriptionRow = {
  id: string;
  user_id: string;
  exercise_name: string;
  template_id: string | null;
  target_weight: number | null;
  target_reps_min: number;
  target_reps_max: number;
  target_sets: number | null;
  action: string;
  confidence: string;
  reason: string | null;
  accepted_at: string;
  consumed_at: string | null;
};

function rowToPrescription(row: PrescriptionRow): ExercisePrescription {
  return {
    id:              row.id,
    user_id:         row.user_id,
    exercise_name:   row.exercise_name,
    template_id:     row.template_id,
    target_weight:   row.target_weight,
    target_reps_min: row.target_reps_min,
    target_reps_max: row.target_reps_max,
    target_sets:     row.target_sets,
    action:          row.action as ExerciseRecommendationAction,
    confidence:      row.confidence as "low" | "medium" | "high",
    reason:          row.reason,
    accepted_at:     row.accepted_at,
    consumed_at:     row.consumed_at,
  };
}

// ─── Accept params ────────────────────────────────────────────────────────────

export type AcceptPrescriptionParams = {
  exercise_name: string;
  template_id?: string;
  target_weight: number | null;
  target_reps_min: number;
  target_reps_max: number;
  target_sets: number | null;
  action: ExerciseRecommendationAction;
  confidence: "low" | "medium" | "high";
  reason?: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePrescriptions(userId: string | null) {
  const [prescriptions, setPrescriptionsState] = useState<ExercisePrescription[]>([]);

  // Always-current ref: updated synchronously before every state write so that
  // getActivePrescriptions() returns fresh data even before the next render.
  const rawRef = useRef<ExercisePrescription[]>([]);

  // Single write path — keeps rawRef and React state in lockstep.
  const setAndSync = (nextOrFn: ExercisePrescription[] | ((prev: ExercisePrescription[]) => ExercisePrescription[])) => {
    const next = typeof nextOrFn === "function" ? nextOrFn(rawRef.current) : nextOrFn;
    rawRef.current = next;
    setPrescriptionsState(next);
  };

  // ── Load active prescriptions on mount / user change ─────────────────────
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("exercise_prescriptions")
      .select("*")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load prescriptions:", error); return; }
        setAndSync((data as PrescriptionRow[] ?? []).map(rowToPrescription));
      });
  }, [userId]);

  // ── Lookup helpers ────────────────────────────────────────────────────────

  const getPrescription = (exerciseName: string): ExercisePrescription | undefined =>
    prescriptions.find((p) => p.exercise_name === exerciseName && p.consumed_at === null);

  // Imperative read — always returns the latest active prescriptions regardless
  // of whether the component has re-rendered since the last state update.
  const getActivePrescriptions = (): ExercisePrescription[] =>
    rawRef.current.filter((p) => p.consumed_at === null);

  // ── Accept (upsert) ───────────────────────────────────────────────────────
  //
  // Creates or replaces the active prescription for an exercise.
  // If one already exists for (user_id, exercise_name) with consumed_at IS NULL,
  // the DB unique index ensures only one can exist — we delete-then-insert to
  // replace it, which is cleaner than a conditional upsert on a partial index.

  const acceptPrescription = async (params: AcceptPrescriptionParams): Promise<void> => {
    if (!userId) return;

    const optimistic: ExercisePrescription = {
      id:              crypto.randomUUID(),
      user_id:         userId,
      exercise_name:   params.exercise_name,
      template_id:     params.template_id ?? null,
      target_weight:   params.target_weight,
      target_reps_min: params.target_reps_min,
      target_reps_max: params.target_reps_max,
      target_sets:     params.target_sets,
      action:          params.action,
      confidence:      params.confidence,
      reason:          params.reason ?? null,
      accepted_at:     new Date().toISOString(),
      consumed_at:     null,
    };

    // Optimistic update: replace any existing active prescription for this exercise.
    setAndSync((prev) => [
      ...prev.filter((p) => p.exercise_name !== params.exercise_name),
      optimistic,
    ]);

    const supabase = createClient();
    try {
      // Delete any existing active prescription for this exercise first.
      await supabase
        .from("exercise_prescriptions")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_name", params.exercise_name)
        .is("consumed_at", null);

      // Insert the new prescription and get the DB-assigned id/accepted_at back.
      const { data, error } = await supabase
        .from("exercise_prescriptions")
        .insert({
          user_id:         userId,
          exercise_name:   params.exercise_name,
          template_id:     params.template_id ?? null,
          target_weight:   params.target_weight,
          target_reps_min: params.target_reps_min,
          target_reps_max: params.target_reps_max,
          target_sets:     params.target_sets,
          action:          params.action,
          confidence:      params.confidence,
          reason:          params.reason ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save prescription:", error);
        // Roll back optimistic update on failure.
        setAndSync((prev) => prev.filter((p) => p.id !== optimistic.id));
        return;
      }

      // Replace optimistic record with the DB-confirmed one.
      const confirmed = rowToPrescription(data as PrescriptionRow);
      setAndSync((prev) => [
        ...prev.filter((p) => p.id !== optimistic.id),
        confirmed,
      ]);
    } catch (err) {
      console.error("Unexpected error saving prescription:", err);
      setAndSync((prev) => prev.filter((p) => p.id !== optimistic.id));
    }
  };

  // ── Clear (delete without consuming) ─────────────────────────────────────
  //
  // Removes the active (consumed_at IS NULL) prescription for an exercise
  // without marking it consumed. Useful for dev tooling and reset flows.

  const clearPrescription = async (exerciseName: string): Promise<void> => {
    if (!userId) return;

    // Optimistic update: remove from local state immediately.
    setAndSync((prev) =>
      prev.filter((p) => !(p.exercise_name === exerciseName && p.consumed_at === null)),
    );

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("exercise_prescriptions")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName)
        .is("consumed_at", null);

      if (error) {
        console.error("Failed to clear prescription:", error);
        // Re-fetch to restore accurate state on failure.
        const { data } = await supabase
          .from("exercise_prescriptions")
          .select("*")
          .eq("user_id", userId)
          .is("consumed_at", null);
        if (data) {
          setAndSync((data as PrescriptionRow[]).map(rowToPrescription));
        }
      }
    } catch (err) {
      console.error("Unexpected error clearing prescription:", err);
    }
  };

  // ── Consume ───────────────────────────────────────────────────────────────
  //
  // Called after saveWorkout() succeeds. Marks all active prescriptions for the
  // given exercise names as consumed so they are not applied again.

  const consumePrescriptions = async (exerciseNames: string[]): Promise<void> => {
    if (!userId || exerciseNames.length === 0) return;

    const now = new Date().toISOString();

    // Optimistic update.
    setAndSync((prev) =>
      prev.map((p) =>
        exerciseNames.includes(p.exercise_name) && p.consumed_at === null
          ? { ...p, consumed_at: now }
          : p,
      ),
    );

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("exercise_prescriptions")
        .update({ consumed_at: now })
        .eq("user_id", userId)
        .in("exercise_name", exerciseNames)
        .is("consumed_at", null);

      if (error) {
        console.error("Failed to consume prescriptions:", error);
        // Roll back: un-consume the records we just marked.
        setAndSync((prev) =>
          prev.map((p) =>
            exerciseNames.includes(p.exercise_name) && p.consumed_at === now
              ? { ...p, consumed_at: null }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error("Unexpected error consuming prescriptions:", err);
    }
  };

  return {
    prescriptions: userId ? prescriptions.filter((p) => p.consumed_at === null) : [],
    getPrescription,
    getActivePrescriptions,
    acceptPrescription,
    consumePrescriptions,
    clearPrescription,
  };
}
