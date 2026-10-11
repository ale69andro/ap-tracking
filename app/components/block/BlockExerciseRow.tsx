"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { BlockExerciseRow as BlockExerciseRowData } from "@/app/types";
import { deltaColor, formatSet, formatSignedKg, formatSignedPct } from "@/app/lib/blockFormat";
import BlockEntryList from "./BlockEntryList";

type Props = { row: BlockExerciseRowData };

export default function BlockExerciseRow({ row }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const start  = row.entries[0];
  const latest = row.entries[row.entries.length - 1];
  const hasProgress = row.entries.length > 1;
  const missing = row.sessionsInBlock - row.entries.length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-800/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-bold text-white truncate min-w-0">{row.exerciseName}</p>
            {start.weekIndex > 1 && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-400">
                neu ab W{start.weekIndex}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 tabular-nums mt-0.5">
            {hasProgress ? `${formatSet(start.bestSet)} → ${formatSet(latest.bestSet)}` : `Start ${formatSet(start.bestSet)}`}
            {" · "}
            {row.entries.length} {row.entries.length === 1 ? "Einheit" : "Einheiten"}
            {missing > 0 && `, ${missing} ohne Wert`}
          </p>
        </div>
        {hasProgress && (
          <div className={`shrink-0 text-right tabular-nums ${deltaColor(latest.deltaVsStartKg)}`}>
            <p className="text-sm font-black leading-tight">{formatSignedKg(latest.deltaVsStartKg)}</p>
            {latest.deltaVsStartPct !== null && (
              <p className="text-xs opacity-80">{formatSignedPct(latest.deltaVsStartPct)}</p>
            )}
          </div>
        )}
        <ChevronDown size={16} className={`shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <BlockEntryList entries={row.entries} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
