"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type DayType     = "training" | "rest";
export type EnergyLevel = "low" | "medium" | "high";

export function useDailyCheckIn(userId: string | null) {
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
    },
    [userId],
  );

  return { submitCheckIn };
}
