"use client";

import {
  getLevelFromXp,
  getXpIntoCurrentLevel,
  getXpNeededForNextLevel,
  getAvatarStage,
} from "@/lib/xp/xpHelpers";

type Props = {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
};

export default function ProfileProgressionSection({
  totalXp,
  currentStreak,
  longestStreak,
}: Props) {
  const level            = getLevelFromXp(totalXp);
  const xpIntoLevel      = getXpIntoCurrentLevel(totalXp);
  const xpNeededForLevel = getXpNeededForNextLevel(totalXp);
  const avatarStage      = getAvatarStage(level);

  const barPct =
    xpNeededForLevel > 0
      ? Math.min(xpIntoLevel / xpNeededForLevel, 1) * 100
      : 100;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      {/* Level row */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-bold text-red-500">LEVEL {level}</span>
        <span className="text-sm text-zinc-400 uppercase tracking-wider">{avatarStage}</span>
      </div>

      {/* XP bar */}
      <div className="h-1.5 bg-zinc-800 rounded-sm overflow-hidden mb-1">
        <div
          className="h-full bg-red-500 rounded-sm transition-all duration-500"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        {xpNeededForLevel > 0
          ? `${xpIntoLevel} / ${xpNeededForLevel} XP`
          : `${totalXp} XP — Max level`}
      </p>

      {/* Streak row */}
      <div className="flex items-center gap-2 text-sm text-white">
        <span>🔥 {currentStreak} day streak</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Best: {longestStreak} days</span>
      </div>
    </div>
  );
}
