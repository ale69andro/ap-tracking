"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import type { BlockLengthWeeks } from "@/app/types";
import type { TrainingBlockState } from "@/app/hooks/useTrainingBlock";
import ConfirmModal from "@/app/components/ConfirmModal";
import BlockHeader from "./BlockHeader";
import BlockSummaryCard from "./BlockSummaryCard";
import BlockDayGroup from "./BlockDayGroup";
import BlockPastList from "./BlockPastList";
import BlockStartSheet from "./BlockStartSheet";
import { getBlockTimeline } from "@/lib/analysis/blockDates";

type Props = { state: TrainingBlockState };

export default function BlockScreen({ state }: Props) {
  const {
    blocks, activeBlock, selectedBlock, selectBlock, result,
    loading, resultLoading, saving, error, clearError, today,
    startBlock, endBlock, cancelBlock,
  } = state;

  const [showStart, setShowStart] = useState(false);
  const [confirm, setConfirm]     = useState<"end" | "cancel" | null>(null);

  const handleStart = async (lengthWeeks: BlockLengthWeeks, startDate: string) => {
    if (await startBlock(lengthWeeks, startDate)) setShowStart(false);
  };

  const handleConfirm = async () => {
    if (!selectedBlock || !confirm) return;
    const ok = confirm === "end" ? await endBlock(selectedBlock.id) : await cancelBlock(selectedBlock.id);
    if (ok) setConfirm(null);
  };

  const handleSelect = (id: string) => {
    clearError();
    selectBlock(id);
    window.scrollTo({ top: 0 });
  };

  const dayLabels: Record<string, string> = {};
  for (const group of result?.groups ?? []) dayLabels[group.templateId] = group.label;

  const hasData = !!result && (result.groups.length > 0 || result.unrated.length > 0);
  const overlayOpen = showStart || confirm !== null;

  const viewingActive = selectedBlock?.status === "active";
  const expired = !!selectedBlock && viewingActive &&
    getBlockTimeline(selectedBlock.startDate, selectedBlock.lengthWeeks, today).expired;
  // Without a loaded block list it is unknown whether a block is already running.
  const canStart = !loading && !activeBlock && !(error && blocks.length === 0);

  return (
    <MotionConfig reducedMotion="user">
      {error && !overlayOpen && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="py-24 text-center text-sm text-zinc-500">Lädt…</p>
      ) : !selectedBlock ? (
        !error && <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-zinc-400 text-base font-bold mb-1">Noch kein Block</p>
          <p className="text-zinc-600 text-sm max-w-xs">
            Starte einen Block über 4, 8 oder 12 Wochen und sieh, wo du stärker geworden bist.
          </p>
        </div>
      ) : (
        <>
          <BlockHeader block={selectedBlock} today={today} />

          {resultLoading ? (
            <p className="py-16 text-center text-sm text-zinc-500">Einheiten werden geladen…</p>
          ) : !hasData ? (
            !error && <div className="py-16 text-center">
              <p className="text-zinc-400 text-base font-bold mb-1">Noch keine Einheiten im Block</p>
              <p className="text-zinc-600 text-sm max-w-xs mx-auto">
                Gezählt werden abgeschlossene Einheiten, die aus einem Template gestartet wurden.
              </p>
            </div>
          ) : (
            result && (
              <>
                <BlockSummaryCard ranking={result.ranking} dayLabels={dayLabels} />

                {result.groups.map((group) => (
                  <BlockDayGroup key={group.templateId} group={group} />
                ))}

                {result.unrated.length > 0 && (
                  <section className="mt-6 px-4 py-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
                    <h2 className="text-sm font-black text-zinc-300">Nicht vergleichbar</h2>
                    <p className="text-xs text-zinc-400 mt-0.5 mb-3">
                      Ohne Zusatzgewicht gibt es kein e1RM.
                    </p>
                    <ul className="space-y-2">
                      {result.unrated.map((day) => (
                        <li key={day.templateId}>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{day.label}</p>
                          <p className="text-sm text-zinc-400">{day.exercises.join(" · ")}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )
          )}

          <BlockPastList
            blocks={blocks.filter((b) => b.id !== selectedBlock.id)}
            onSelect={handleSelect}
          />

          {/* Rare, final actions — bottom of the page, clearly separated */}
          {viewingActive && (
            <section className="mt-8 pt-6 border-t border-zinc-800/70 space-y-2">
              {!expired && (
                <button
                  type="button"
                  onClick={() => { clearError(); setConfirm("end"); }}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-zinc-800 active:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 font-bold text-sm transition-colors"
                >
                  Block beenden
                </button>
              )}
              <button
                type="button"
                onClick={() => { clearError(); setConfirm("cancel"); }}
                disabled={saving}
                className="w-full py-3 text-sm font-bold text-zinc-500 active:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none"
              >
                Block abbrechen
              </button>
            </section>
          )}
        </>
      )}

      {/* Primary action — thumb zone */}
      {(canStart || expired) && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto px-4">
            <button
              type="button"
              onClick={() => { clearError(); if (expired) setConfirm("end"); else setShowStart(true); }}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors"
            >
              {expired ? "Block beenden" : "Block starten"}
            </button>
          </div>
        </div>
      )}

      {showStart && (
        <BlockStartSheet
          defaultStartDate={today}
          saving={saving}
          error={error}
          onStart={handleStart}
          onClose={() => { clearError(); setShowStart(false); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm === "end" ? "Block beenden?" : "Block abbrechen?"}
          description={
            confirm === "end"
              ? "Der Block wird mit heutigem Datum abgeschlossen und bleibt in deinen Blöcken gespeichert."
              : "Der Block wird als abgebrochen markiert und bleibt in deinen Blöcken gespeichert. Deine Einheiten bleiben unverändert."
          }
          confirmLabel={confirm === "end" ? "Block beenden" : "Block abbrechen"}
          cancelLabel="Zurück"
          loadingLabel="Speichert…"
          loading={saving}
          error={error ?? undefined}
          onConfirm={handleConfirm}
          onCancel={() => { clearError(); setConfirm(null); }}
        />
      )}
    </MotionConfig>
  );
}
