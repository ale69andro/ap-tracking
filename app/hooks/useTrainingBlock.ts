"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BlockLengthWeeks,
  BlockResult,
  TrainingBlock,
  TrainingBlockStatus,
  WorkoutSession,
} from "@/app/types";
import { createClient } from "@/lib/supabase/client";
import { rowToSession, type SessionRow } from "@/app/hooks/useWorkout";
import { computeBlockProgress } from "@/lib/analysis/computeBlockProgress";
import { addDays, parseLocalDate, toLocalDateKey } from "@/lib/analysis/blockDates";

// ─── Supabase row mappers ─────────────────────────────────────────────────────

type TrainingBlockRow = {
  id: string;
  user_id: string;
  start_date: string;
  length_weeks: number;
  status: string;
  ended_at: string | null;
  created_at: string;
};

function rowToBlock(row: TrainingBlockRow): TrainingBlock {
  return {
    id:          row.id,
    startDate:   row.start_date,
    lengthWeeks: row.length_weeks as BlockLengthWeeks,
    status:      row.status as TrainingBlockStatus,
    createdAt:   new Date(row.created_at).getTime(),
    endedAt:     row.ended_at ?? undefined,
  };
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIQUE_VIOLATION = "23505";

const ERR_ACTIVE_EXISTS = "Es läuft bereits ein Block.";
const ERR_SAVE          = "Speichern fehlgeschlagen. Bitte erneut versuchen.";
const ERR_LOAD          = "Blöcke konnten nicht geladen werden.";

function sortBlocks(blocks: TrainingBlock[]): TrainingBlock[] {
  return [...blocks].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt - a.createdAt);
}

type BlockData = {
  blockId: string;
  sessions: WorkoutSession[];
  templateNames: Record<string, string>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainingBlock(userId: string | null) {
  const [blocks, setBlocks]         = useState<TrainingBlock[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blockData, setBlockData]   = useState<BlockData | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [today]                     = useState(() => toLocalDateKey(Date.now()));

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("training_blocks")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load training blocks:", error);
          setError(ERR_LOAD);
        } else {
          setBlocks(sortBlocks((data as TrainingBlockRow[] ?? []).map(rowToBlock)));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const activeBlock   = blocks.find((b) => b.status === "active") ?? null;
  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? activeBlock ?? blocks[0] ?? null;

  // Sessions are fetched for the planned window; ending a block early only
  // narrows it, so the loaded data stays valid and is re-filtered in the lib.
  const selectedBlockId = selectedBlock?.id ?? null;
  const windowStart     = selectedBlock?.startDate ?? null;
  const lengthWeeks     = selectedBlock?.lengthWeeks ?? null;

  useEffect(() => {
    if (!userId || !selectedBlockId || !windowStart || !lengthWeeks) return;
    let cancelled = false;

    const supabase = createClient();
    const fromIso  = parseLocalDate(windowStart).toISOString();
    const toIso    = parseLocalDate(addDays(windowStart, lengthWeeks * 7)).toISOString();

    Promise.all([
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("template_id", "is", null)
        .gte("started_at", fromIso)
        .lt("started_at", toIso)
        .order("started_at", { ascending: true }),
      supabase
        .from("workout_templates")
        .select("id, name")
        .eq("user_id", userId),
    ]).then(([sessionsRes, templatesRes]) => {
      if (cancelled) return;
      if (sessionsRes.error) {
        console.error("Failed to load block sessions:", sessionsRes.error);
        setError(ERR_LOAD);
      }
      // Template names are only labels — the lib falls back to session names.
      if (templatesRes.error) console.error("Failed to load template names:", templatesRes.error);

      const templateNames: Record<string, string> = {};
      for (const t of (templatesRes.data as { id: string; name: string }[] | null) ?? []) {
        templateNames[t.id] = t.name;
      }
      setBlockData({
        blockId:  selectedBlockId,
        sessions: (sessionsRes.data as SessionRow[] | null ?? []).map(rowToSession),
        templateNames,
      });
    });

    return () => { cancelled = true; };
  }, [userId, selectedBlockId, windowStart, lengthWeeks]);

  const result: BlockResult | null = useMemo(() => {
    if (!selectedBlock || !blockData || blockData.blockId !== selectedBlock.id) return null;
    return computeBlockProgress(selectedBlock, blockData.sessions, blockData.templateNames);
  }, [selectedBlock, blockData]);

  const startBlock = async (lengthWeeks: BlockLengthWeeks, startDate: string): Promise<boolean> => {
    if (!userId || saving) return false;
    if (!DATE_KEY_RE.test(startDate)) { setError("Bitte ein gültiges Startdatum wählen."); return false; }
    if (activeBlock) { setError(ERR_ACTIVE_EXISTS); return false; }

    const newBlock: TrainingBlock = {
      id:        crypto.randomUUID(),
      startDate,
      lengthWeeks,
      status:    "active",
      createdAt: Date.now(),
    };
    const previous = blocks;
    setError(null);
    setSaving(true);
    setBlocks(sortBlocks([...blocks, newBlock]));
    setSelectedId(newBlock.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("training_blocks").insert({
        id:           newBlock.id,
        user_id:      userId,
        start_date:   startDate,
        length_weeks: lengthWeeks,
        status:       "active",
      });
      if (error) {
        console.error("Failed to start training block:", error);
        setBlocks(previous);
        setSelectedId(null);
        setError(error.code === UNIQUE_VIOLATION ? ERR_ACTIVE_EXISTS : ERR_SAVE);
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const closeBlock = async (id: string, status: "completed" | "cancelled"): Promise<boolean> => {
    if (!userId || saving) return false;
    const target = blocks.find((b) => b.id === id);
    if (!target || target.status !== "active") return false;

    const previous = blocks;
    setError(null);
    setSaving(true);
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, status, endedAt: today } : b)));
    // Keep showing the block that was just closed.
    setSelectedId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("training_blocks")
        .update({ status, ended_at: today })
        .eq("id", id)
        .eq("user_id", userId); // belt-and-suspenders alongside RLS
      if (error) {
        console.error("Failed to update training block:", error);
        setBlocks(previous);
        setError(ERR_SAVE);
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const endBlock    = (id: string) => closeBlock(id, "completed");
  const cancelBlock = (id: string) => closeBlock(id, "cancelled");

  return {
    // Gate on userId so stale state from a previous session is never exposed.
    blocks:        userId ? blocks : [],
    activeBlock:   userId ? activeBlock : null,
    selectedBlock: userId ? selectedBlock : null,
    selectBlock:   setSelectedId,
    result:        userId ? result : null,
    loading:       userId ? loading : false,
    resultLoading: !!userId && !!selectedBlock && result === null,
    saving,
    error,
    clearError:    () => setError(null),
    today,
    startBlock,
    endBlock,
    cancelBlock,
  };
}

export type TrainingBlockState = ReturnType<typeof useTrainingBlock>;
