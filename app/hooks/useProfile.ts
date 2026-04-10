"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  UserProfile,
  StressLevel,
  IntensityStyle,
  ProximityToFailure,
  EquipmentAccess,
  MuscleGroup,
} from "@/app/types";

type ProfileRow = {
  id: string;
  sex: string;
  weight: number;
  height: number;
  experience: string;
  goal: string;
  training_days_per_week: number;
  sleep_quality: string;
  keep_screen_on: boolean | null;
  rest_timer_sound: boolean | null;
  stress_level: string | null;
  intensity_style: string | null;
  proximity_to_failure: string | null;
  equipment_access: string | null;
  priority_muscle_groups: string[] | null;
};

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    sex:                 row.sex        as UserProfile["sex"],
    weight:              row.weight,
    height:              row.height,
    experience:          row.experience as UserProfile["experience"],
    goal:                row.goal       as UserProfile["goal"],
    trainingDaysPerWeek: row.training_days_per_week,
    sleepQuality:        row.sleep_quality as UserProfile["sleepQuality"],
    keepScreenOn:          row.keep_screen_on  ?? true,
    restTimerSound:        row.rest_timer_sound ?? false,
    stressLevel:           (row.stress_level as StressLevel) ?? undefined,
    intensityStyle:        (row.intensity_style as IntensityStyle) ?? undefined,
    proximityToFailure:    (row.proximity_to_failure as ProximityToFailure) ?? undefined,
    equipmentAccess:       (row.equipment_access as EquipmentAccess) ?? undefined,
    priorityMuscleGroups:  (row.priority_muscle_groups as MuscleGroup[]) ?? undefined,
  };
}

export function useProfile(userId: string | null) {
  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  // Track which userId's profile has been fetched. undefined = not yet fetched.
  const [loadedUserId,  setLoadedUserId]  = useState<string | null | undefined>(undefined);

  // Derived: we are "loading" only when a userId exists but we haven't fetched for it yet.
  const loading = !!userId && loadedUserId !== userId;

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load profile:", {
            message: error?.message,
            details: error?.details,
            hint:    error?.hint,
            code:    error?.code,
          });
        }
        // Both setters are called inside a .then() callback — no synchronous setState.
        setProfile(data ? rowToProfile(data as ProfileRow) : null);
        setLoadedUserId(userId);
      });
  }, [userId]);

  const saveProfile = async (data: UserProfile): Promise<void> => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("user_profiles").upsert(
      {
        id:                     userId,
        sex:                    data.sex,
        weight:                 data.weight,
        height:                 data.height,
        experience:             data.experience,
        goal:                   data.goal,
        training_days_per_week: data.trainingDaysPerWeek,
        sleep_quality:          data.sleepQuality,
        keep_screen_on:          data.keepScreenOn  ?? true,
        rest_timer_sound:        data.restTimerSound ?? false,
        stress_level:            data.stressLevel            ?? null,
        intensity_style:         data.intensityStyle         ?? null,
        proximity_to_failure:    data.proximityToFailure     ?? null,
        equipment_access:        data.equipmentAccess        ?? null,
        priority_muscle_groups:  data.priorityMuscleGroups   ?? null,
        updated_at:              new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error("Failed to save profile:", {
        message: error?.message,
        details: error?.details,
        hint:    error?.hint,
        code:    error?.code,
      });
      throw error;
    }
    setProfile(data);
  };

  return { profile, loading, saveProfile };
}
