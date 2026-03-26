"use client";

import { useState, useEffect } from "react";
import type { DayType, EnergyLevel } from "@/app/hooks/useDailyCheckIn";
import { XP_VALUES } from "@/lib/xp/xpConfig";
import { getAvatarStage } from "@/lib/xp/xpHelpers";

type Props = {
  level:            number;
  xpIntoLevel:      number;
  xpNeededForLevel: number;
  currentStreak:    number;
  onContinue: (dayType: DayType, energyLevel?: EnergyLevel) => void;
  onDismiss:  () => void;
};

type SuccessData = {
  xpGained:  number;
  leveledUp: boolean;
  newLevel:  number;
  message:   string;
};

const ENERGY_LEVELS: EnergyLevel[] = ["low", "medium", "high"];

export default function DailyCheckIn({
  level,
  xpIntoLevel,
  xpNeededForLevel,
  currentStreak,
  onContinue,
  onDismiss,
}: Props) {
  const [dayType, setDayType] = useState<DayType | null>(null);
  const [energy,  setEnergy]  = useState<EnergyLevel | null>(null);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  // Auto-dismiss 1.8s after success is shown
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => onDismiss(), 1800);
    return () => clearTimeout(t);
  }, [success, onDismiss]);

  const handleContinue = () => {
    if (!dayType) return;
    const xpGained    = dayType === "rest"
      ? XP_VALUES.rest_day_check_in
      : XP_VALUES.daily_check_in;
    const willLevelUp = xpNeededForLevel > 0 && (xpIntoLevel + xpGained) >= xpNeededForLevel;
    const newLevel    = willLevelUp ? level + 1 : level;
    const message     = dayType === "rest"
      ? "Recovery logged"
      : currentStreak > 0 ? "Streak continued" : "Streak started";
    setSuccess({ xpGained, leveledUp: willLevelUp, newLevel, message });
    onContinue(dayType, energy ?? undefined);
  };

  const barPercent = xpNeededForLevel > 0
    ? Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-80 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">

        {success ? (

          /* ── Success state ─────────────────────────────────────────── */
          <div className="py-6 text-center">
            {success.leveledUp ? (
              <>
                <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-3">
                  Level Up
                </p>
                <p className="text-4xl font-black text-white leading-none">
                  Level {success.newLevel}
                </p>
                <p className="text-sm text-zinc-400 mt-2">
                  {getAvatarStage(success.newLevel)}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-red-500 leading-none mb-3">
                  +{success.xpGained} XP
                </p>
                <p className="text-sm text-zinc-400">
                  {success.message}
                </p>
              </>
            )}
          </div>

        ) : (

          /* ── Form state ────────────────────────────────────────────── */
          <>
            {/* Header */}
            <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-1">
              AP-Tracking
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-4">
              TODAY
            </h2>

            {/* XP progress */}
            <div className="mb-6">
              <div className="w-full bg-zinc-800 rounded-full h-1 mb-2">
                <div
                  className="bg-red-500 h-1 rounded-full"
                  style={{ width: `${barPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400 font-semibold">
                  Level {level} · {getAvatarStage(level)}
                </span>
                <span className="text-zinc-600 tabular-nums">
                  {xpIntoLevel} / {xpNeededForLevel} XP
                </span>
              </div>
            </div>

            {/* Day type */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setDayType("training")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                  dayType === "training"
                    ? "bg-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.35)]"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="block">Training Day</span>
                <span className={`block text-[11px] font-medium mt-0.5 ${
                  dayType === "training" ? "text-red-200" : "text-zinc-500"
                }`}>
                  +{XP_VALUES.daily_check_in} XP
                </span>
              </button>
              <button
                onClick={() => setDayType("rest")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                  dayType === "rest"
                    ? "bg-zinc-700 text-white border border-zinc-500"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="block">Rest Day</span>
                <span className={`block text-[11px] font-medium mt-0.5 ${
                  dayType === "rest" ? "text-zinc-300" : "text-zinc-500"
                }`}>
                  +{XP_VALUES.rest_day_check_in} XP
                </span>
              </button>
            </div>

            {/* Energy level */}
            <p className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-2">
              Energy today{" "}
              <span className="text-zinc-700 normal-case font-normal tracking-normal">
                optional
              </span>
            </p>
            <div className="flex gap-2 mb-6">
              {ENERGY_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setEnergy(energy === lvl ? null : lvl)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                    energy === lvl
                      ? "bg-zinc-700 text-white border border-zinc-500"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Continue */}
            <button
              disabled={!dayType}
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-sm tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              Continue
            </button>

            {/* Later */}
            <button
              onClick={onDismiss}
              className="w-full py-1.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Later
            </button>
          </>

        )}

      </div>
    </div>
  );
}
