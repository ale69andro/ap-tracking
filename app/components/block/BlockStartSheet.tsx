"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { BlockLengthWeeks } from "@/app/types";
import { useScrollLock } from "@/app/hooks/useScrollLock";

const LENGTHS: BlockLengthWeeks[] = [4, 8, 12];

type Props = {
  defaultStartDate: string;
  saving: boolean;
  error: string | null;
  onStart: (lengthWeeks: BlockLengthWeeks, startDate: string) => void;
  onClose: () => void;
};

export default function BlockStartSheet({ defaultStartDate, saving, error, onStart, onClose }: Props) {
  const [lengthWeeks, setLengthWeeks] = useState<BlockLengthWeeks>(8);
  const [startDate, setStartDate]     = useState(defaultStartDate);
  useScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={saving ? undefined : onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-start-title"
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-t-3xl px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="block-start-title" className="text-xl font-black text-white mb-1">Block starten</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Das Startdatum darf in der Vergangenheit liegen – vorhandene Einheiten werden dann mit ausgewertet.
        </p>

        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Länge</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {LENGTHS.map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => setLengthWeeks(weeks)}
              aria-pressed={lengthWeeks === weeks}
              className={`py-4 rounded-2xl border text-center transition-colors ${
                lengthWeeks === weeks
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 active:bg-zinc-700"
              }`}
            >
              <span className="block text-2xl font-black leading-none tabular-nums">{weeks}</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Wochen</span>
            </button>
          ))}
        </div>

        <label htmlFor="block-start-date" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
          Startdatum
        </label>
        <input
          id="block-start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="block w-full min-w-0 mb-6 px-4 py-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-base font-bold [color-scheme:dark] focus:outline-none focus:border-red-500"
        />

        {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onStart(lengthWeeks, startDate)}
            disabled={saving || !startDate}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors"
          >
            {saving ? "Startet…" : "Block starten"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-300 font-bold text-sm transition-colors"
          >
            Schließen
          </button>
        </div>
      </motion.div>
    </div>
  );
}
