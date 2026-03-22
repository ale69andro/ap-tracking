"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIBRARY } from "@/app/constants/exercises";
import type { LibraryExercise, Equipment } from "@/app/types";

type UserExerciseRow = {
  id: string;
  user_id: string;
  name: string;
  muscle_groups: string[];
  equipment: string | null;
  created_at: string;
};

function rowToLibraryExercise(row: UserExerciseRow): LibraryExercise {
  return {
    name: row.name,
    muscleGroups: row.muscle_groups,
    // null (old rows without equipment) maps to undefined — backward-compatible
    ...(row.equipment ? { equipment: row.equipment as Equipment } : {}),
  };
}

export function useExerciseLibrary(userId: string | null) {
  const [userExercises, setUserExercises] = useState<LibraryExercise[]>([]);

  const loadExercises = useCallback(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_exercises")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load user exercises:", error); return; }
        setUserExercises((data as UserExerciseRow[] ?? []).map(rowToLibraryExercise));
      });
  }, [userId]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  /**
   * Inserts a custom exercise into user_exercises.
   * Normalizes the name (trim). Throws on DB error so callers can surface it.
   * On success, reloads the full list from DB and returns the exercise.
   */
  const createUserExercise = async (
    name: string,
    muscleGroups: string[],
    equipment?: Equipment,
  ): Promise<LibraryExercise> => {
    console.log("🔥 CREATE USER EXERCISE CALLED");
    if (!userId) throw new Error("Not authenticated");
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const normalizedLower = normalizedName.toLowerCase();

    const isDuplicate =
      LIBRARY.some((e) => e.name.toLowerCase() === normalizedLower) ||
      userExercises.some((e) => e.name.toLowerCase() === normalizedLower);
    if (isDuplicate) throw new Error("DUPLICATE_EXERCISE");

    const supabase = createClient();

    const { error } = await supabase
      .from("user_exercises")
      .insert({ user_id: userId, name: normalizedName, muscle_groups: muscleGroups, equipment: equipment ?? null });

    if (error) throw error;

    loadExercises();

    return { name: normalizedName, muscleGroups, ...(equipment ? { equipment } : {}) };
  };

  return { userExercises, createUserExercise };
}
