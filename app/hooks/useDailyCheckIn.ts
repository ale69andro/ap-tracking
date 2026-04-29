"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DayType, EnergyLevel, DailyCheckIn } from "@/app/types";

// Re-export so existing callers using the old import path still work
export type { DayType, EnergyLevel };

export function useDailyCheckIn(userId: string | null) {
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);

  // Load today's check-in on mount / when userId changes
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const today    = new Date().toISOString().split("T")[0];

    supabase
      .from("daily_checkins")
      .select("day_type, energy_level")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTodayCheckIn({
            dayType:     data.day_type as DayType,
            energyLevel: (data.energy_level as EnergyLevel) ?? null,
          });
        }
      });
  }, [userId]);

  const submitCheckIn = useCallback(
    async (dayType: DayType, energyLevel?: EnergyLevel) => {
      if (!userId) return;
      const supabase = createClient();
      const today    = new Date().toISOString().split("T")[0];

      await supabase.from("daily_checkins").upsert(
        {
          user_id:      userId,
          date:         today,
          day_type:     dayType,
          energy_level: energyLevel ?? null,
        },
        { onConflict: "user_id,date" },
      );

      // Update local state immediately so the rest of the app sees the new value
      setTodayCheckIn({ dayType, energyLevel: energyLevel ?? null });
    },
    [userId],
  );

  return { submitCheckIn, todayCheckIn };
}
