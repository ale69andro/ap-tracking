"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { ExerciseVariant } from "@/app/types";
import { getExerciseVariant } from "@/app/lib/exerciseVariant";
import ConfirmModal from "./ConfirmModal";

type Props = {
  exerciseName: string;
  /** Sets already completed in this session move to the new variant with the exercise. */
  hasCompletedSets: boolean;
  onChange: (variant: ExerciseVariant) => void;
};

// Pill that shows the current variant and switches it after a confirmation —
// never on a single tap, since the switch re-fills the open sets.
export default function ExerciseVariantToggle({ exerciseName, hasCompletedSets, onChange }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isUnilateral = getExerciseVariant(exerciseName) === "unilateral";
  const next: ExerciseVariant = isUnilateral ? "bilateral" : "unilateral";

  const description = [
    isUnilateral
      ? "Weight counts for both sides together again."
      : "Weight is per side. History and PRs are kept separate.",
    `Open sets refill from your last ${next} session or clear.`,
    hasCompletedSets ? "Completed sets keep their values and move with it." : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`${isUnilateral ? "Unilateral" : "Bilateral"} — switch to ${next}`}
        title={`Switch to ${next}`}
        className={`h-9 min-w-10 px-2 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
          isUnilateral
            ? "bg-red-500/15 border-red-500/50 text-red-400"
            : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-300"
        }`}
      >
        {isUnilateral ? "Uni" : "Bi"}
      </button>
      {confirmOpen && typeof document !== "undefined" && createPortal(
        <ConfirmModal
          title={`Switch to ${next}?`}
          description={description}
          confirmLabel="Switch"
          cancelLabel="Cancel"
          onConfirm={() => { setConfirmOpen(false); onChange(next); }}
          onCancel={() => setConfirmOpen(false)}
        />,
        document.body
      )}
    </>
  );
}
