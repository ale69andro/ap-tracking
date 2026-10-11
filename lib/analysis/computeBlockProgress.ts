import type {
  BlockDayGroup,
  BlockEntry,
  BlockExerciseRow,
  BlockResult,
  BlockVerdict,
  ExerciseSet,
  TrainingBlock,
  WorkoutSession,
} from "@/app/types";
import { getEffectiveSets } from "@/app/lib/workout";
import { calculate1RM } from "./calculate1RM";
import { getBlockWindow, toLocalDateKey, weekIndexOf } from "./blockDates";

/** Above this rep count the e1RM is flagged as imprecise. */
export const E1RM_UNRELIABLE_ABOVE_REPS = 12;

/** Verdict changes within ±this percentage count as flat (noise). */
export const BLOCK_VERDICT_THRESHOLD_PCT = 1;

/** Group label when neither the template nor a session name is available. */
export const DELETED_TEMPLATE_LABEL = "Gelöschtes Template";

type BestSet = { weight: number; reps: number; e1rm: number };

function pctChange(from: number, to: number): number | null {
  return from > 0 ? ((to - from) / from) * 100 : null;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Best working set of one session: highest e1RM among completed, non-warm-up
 * sets with weight > 0 and reps > 0. Tie-break: heavier weight, then more reps.
 * Returns null when no such set exists (e.g. bodyweight or nothing completed).
 */
export function getBestBlockSet(sets: ExerciseSet[]): BestSet | null {
  let best: BestSet | null = null;
  for (const s of getEffectiveSets(sets)) {
    const weight = parseFloat(s.weight) || 0;
    const reps = parseInt(s.reps, 10) || 0;
    if (weight <= 0 || reps <= 0) continue;
    const e1rm = calculate1RM(weight, reps);
    if (
      !best ||
      e1rm > best.e1rm ||
      (e1rm === best.e1rm && (weight > best.weight || (weight === best.weight && reps > best.reps)))
    ) {
      best = { weight, reps, e1rm };
    }
  }
  return best;
}

/**
 * Block verdict: average e1RM of the first k entries vs the last k entries.
 * k = min(2, floor(n / 2)) so both sides never share a session.
 */
export function computeBlockVerdict(entries: BlockEntry[]): BlockVerdict {
  const k = Math.min(2, Math.floor(entries.length / 2));
  if (k === 0) {
    return { status: "insufficient", startAvg: null, endAvg: null, deltaKg: null, deltaPct: null, sampleSize: 0 };
  }
  const startAvg = average(entries.slice(0, k).map((e) => e.e1rm));
  const endAvg = average(entries.slice(-k).map((e) => e.e1rm));
  const deltaPct = pctChange(startAvg, endAvg);
  const status =
    deltaPct === null
      ? "insufficient"
      : deltaPct >= BLOCK_VERDICT_THRESHOLD_PCT
        ? "up"
        : deltaPct <= -BLOCK_VERDICT_THRESHOLD_PCT
          ? "down"
          : "flat";
  return { status, startAvg, endAvg, deltaKg: endAvg - startAvg, deltaPct, sampleSize: k };
}

type GroupDraft = {
  templateId: string;
  latestSessionName: string;
  rows: Map<string, BlockExerciseRow>;
  /** Exercise names that had completed working sets but never a loaded one. */
  unloaded: Set<string>;
};

/**
 * Strength progress across a training block, computed purely from completed
 * sessions. Series key is training day (templateId) + exercise name: the same
 * exercise in two templates yields two independent series, and a renamed or
 * newly added exercise starts its own series with its own baseline.
 *
 * Sessions without a templateId are ignored.
 */
export function computeBlockProgress(
  block: Pick<TrainingBlock, "startDate" | "lengthWeeks" | "endedAt">,
  sessions: WorkoutSession[],
  templateNames: Record<string, string>,
): BlockResult {
  const window = getBlockWindow(block.startDate, block.lengthWeeks, block.endedAt);
  let ignoredSessions = 0;

  const inWindow = sessions
    .filter((s) => s.status === "completed" && s.startedAt > 0)
    .map((session) => ({ session, dateKey: toLocalDateKey(session.startedAt) }))
    .filter(({ dateKey }) => dateKey >= window.start && dateKey < window.endExclusive)
    .filter(({ session }) => {
      if (session.templateId) return true;
      ignoredSessions++;
      return false;
    })
    .sort((a, b) => a.session.startedAt - b.session.startedAt || a.session.id.localeCompare(b.session.id));

  const groups = new Map<string, GroupDraft>();

  for (const { session, dateKey } of inWindow) {
    const templateId = session.templateId as string;
    let group = groups.get(templateId);
    if (!group) {
      group = { templateId, latestSessionName: "", rows: new Map(), unloaded: new Set() };
      groups.set(templateId, group);
    }
    if (session.name.trim()) group.latestSessionName = session.name.trim();

    // An exercise listed twice in one session counts as one unit.
    const setsByName = new Map<string, ExerciseSet[]>();
    for (const exercise of session.exercises) {
      const name = exercise.exerciseName.trim();
      if (!name) continue;
      setsByName.set(name, [...(setsByName.get(name) ?? []), ...exercise.sets]);
    }

    for (const [exerciseName, sets] of setsByName) {
      const key = `${templateId}::${exerciseName}`;
      let row = group.rows.get(key);
      if (!row) {
        row = {
          key,
          templateId,
          exerciseName,
          entries: [],
          sessionsInBlock: 0,
          verdict: computeBlockVerdict([]),
        };
        group.rows.set(key, row);
      }
      row.sessionsInBlock++;

      const best = getBestBlockSet(sets);
      if (!best) {
        if (getEffectiveSets(sets).length > 0) group.unloaded.add(exerciseName);
        continue;
      }

      const start = row.entries[0];
      const prev = row.entries[row.entries.length - 1];
      row.entries.push({
        sessionId: session.id,
        dateKey,
        startedAt: session.startedAt,
        weekIndex: weekIndexOf(dateKey, block.startDate),
        bestSet: { weight: best.weight, reps: best.reps },
        e1rm: best.e1rm,
        e1rmUnreliable: best.reps > E1RM_UNRELIABLE_ABOVE_REPS,
        deltaVsStartKg: start ? best.e1rm - start.e1rm : 0,
        deltaVsStartPct: start ? pctChange(start.e1rm, best.e1rm) : 0,
        deltaVsPrevKg: prev ? best.e1rm - prev.e1rm : null,
        deltaVsPrevPct: prev ? pctChange(prev.e1rm, best.e1rm) : null,
      });
    }
  }

  const resultGroups: BlockDayGroup[] = [...groups.values()].map((group) => {
    const rows = [...group.rows.values()].filter((row) => row.entries.length > 0);
    for (const row of rows) row.verdict = computeBlockVerdict(row.entries);
    const rated = new Set(rows.map((row) => row.exerciseName));
    return {
      templateId: group.templateId,
      label: templateNames[group.templateId] || group.latestSessionName || DELETED_TEMPLATE_LABEL,
      rows,
      unratedExercises: [...group.unloaded].filter((name) => !rated.has(name)),
    };
  });

  const ranking = resultGroups
    .flatMap((group) => group.rows)
    .sort((a, b) => {
      const aPct = a.verdict.deltaPct;
      const bPct = b.verdict.deltaPct;
      if (aPct === null || bPct === null) {
        if (aPct === bPct) return a.key.localeCompare(b.key);
        return aPct === null ? 1 : -1;
      }
      return bPct - aPct || a.key.localeCompare(b.key);
    });

  return {
    windowStart: window.start,
    windowEnd: window.endExclusive,
    groups: resultGroups,
    ranking,
    ignoredSessions,
  };
}
