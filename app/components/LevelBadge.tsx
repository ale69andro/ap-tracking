"use client";

type Props = {
  level: number;
  onClick: () => void;
};

export default function LevelBadge({ level, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 cursor-pointer hover:border-zinc-500 transition-colors bg-zinc-900"
    >
      LV {level}
    </button>
  );
}
