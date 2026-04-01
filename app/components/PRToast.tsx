"use client";

import { useEffect, useState } from "react";

export type PRType = "e1rm" | "weight";

type Props = {
  type: PRType;
  exerciseName: string;
  value: number;
  onDismiss: () => void;
};

export default function PRToast({ type, exerciseName, value, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer  = setTimeout(() => setVisible(false), 2500);
    const closeTimer = setTimeout(() => onDismiss(), 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 border border-red-500/50 shadow-[0_0_28px_rgba(239,68,68,0.25)] whitespace-nowrap">
        <span className="text-base">🏆</span>
        <div>
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-none mb-0.5">
            {type === "e1rm" ? "New e1RM PR" : "New Weight PR"}
          </p>
          <p className="text-sm font-semibold text-white leading-tight">
            {exerciseName}
            <span className="text-zinc-400 font-normal">
              {" · "}
              {value} kg{type === "e1rm" ? " est." : ""}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
