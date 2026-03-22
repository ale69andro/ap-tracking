"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/app/types";

type ProfileRow = {
  id: string;
  sex: string;
  weight: number;
  height: number;
  experience: string;
  goal: string;
  training_days_per_week: number;
  sleep_quality: string;
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
        updated_at:             new Date().toISOString(),
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
