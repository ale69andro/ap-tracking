import { describe, expect, it } from "vitest";
import type { BlockLengthWeeks, TrainingBlock, WorkoutSession } from "@/app/types";
import {
  BLOCK_VERDICT_THRESHOLD_PCT,
  DELETED_TEMPLATE_LABEL,
  E1RM_UNRELIABLE_ABOVE_REPS,
  computeBlockProgress,
  computeBlockVerdict,
  getBestBlockSet,
} from "@/lib/analysis/computeBlockProgress";
import { blockEntry, exercise, session, set } from "@/lib/analysis/__fixtures__/blockFixtures";

type BlockInput = Pick<TrainingBlock, "startDate" | "lengthWeeks" | "endedAt">;

function block(startDate: string, lengthWeeks: BlockLengthWeeks = 4, endedAt?: string): BlockInput {
  return { startDate, lengthWeeks, endedAt };
}

/** Epley with the 15-rep cap, computed independently of the production code. */
function epley(weight: number, reps: number): number {
  return weight * (1 + Math.min(reps, 15) / 30);
}

/** Session with a single "Bench" exercise holding one 5-rep set. */
function benchSession(id: string, date: string, weight: string, templateId = "t1"): WorkoutSession {
  return session({ id, templateId, date, exercises: [exercise("Bench", [set(weight, "5")])] });
}

/** Date keys of all entries across all rows of the result. */
function entryDates(b: BlockInput, sessions: WorkoutSession[]): string[] {
  const result = computeBlockProgress(b, sessions, {});
  return result.groups.flatMap((g) => g.rows).flatMap((r) => r.entries.map((e) => e.dateKey));
}

function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number") {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectNumbers(v, out));
  } else if (value !== null && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((v) => collectNumbers(v, out));
  }
  return out;
}

describe("constants", () => {
  it("exposes the spec thresholds", () => {
    expect(E1RM_UNRELIABLE_ABOVE_REPS).toBe(12);
    expect(BLOCK_VERDICT_THRESHOLD_PCT).toBe(1);
    expect(DELETED_TEMPLATE_LABEL).toBeTruthy();
  });
});

describe("getBestBlockSet", () => {
  it("picks the best set by e1RM, not by weight", () => {
    // 100x3 -> 110, 90x8 -> 114
    const best = getBestBlockSet([set("100", "3"), set("90", "8")]);
    expect(best).not.toBeNull();
    expect(best?.weight).toBe(90);
    expect(best?.reps).toBe(8);
    expect(best?.e1rm).toBeCloseTo(114, 6);
  });

  it("breaks a tie at the rep cap by more reps", () => {
    // 60x15 and 60x20 both give 90 (cap at 15).
    expect(getBestBlockSet([set("60", "15"), set("60", "20")])?.reps).toBe(20);
    expect(getBestBlockSet([set("60", "20"), set("60", "15")])?.reps).toBe(20);
  });

  it("breaks an equal-e1RM tie by higher weight", () => {
    // 50x6 -> 60, 40x15 -> 60
    expect(getBestBlockSet([set("40", "15"), set("50", "6")])?.weight).toBe(50);
    expect(getBestBlockSet([set("50", "6"), set("40", "15")])?.weight).toBe(50);
  });

  it("counts drop sets as working sets", () => {
    const best = getBestBlockSet([set("50", "10"), set("70", "8", { type: "Drop Set" })]);
    // 70x8 -> 88.67, 50x10 -> 66.67
    expect(best?.weight).toBe(70);
  });

  it("returns null without a valid set", () => {
    expect(getBestBlockSet([])).toBeNull();
    expect(getBestBlockSet([set("0", "10"), set("50", "0"), set("", ""), set("abc", "5")])).toBeNull();
  });

  it("parses decimal weights", () => {
    const best = getBestBlockSet([set("82.5", "5")]);
    expect(best?.weight).toBe(82.5);
    expect(best?.e1rm).toBeCloseTo(epley(82.5, 5), 6);
  });
});

describe("computeBlockProgress: entries and deltas", () => {
  it("uses the first valid entry as baseline with deltas in kg and pct over 3 sessions", () => {
    const sessions = [
      benchSession("s1", "2026-01-05", "80"),
      benchSession("s2", "2026-01-12", "85"),
      benchSession("s3", "2026-01-19", "90"),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, { t1: "Push" });
    const row = result.groups[0].rows[0];
    const [e1, e2, e3] = row.entries;

    // e1RM at 5 reps = weight * 7/6: 93.3333, 99.1667, 105
    expect(e1.e1rm).toBeCloseTo(93.3333, 3);
    expect(e1.deltaVsStartKg).toBe(0);
    expect(e1.deltaVsStartPct).toBe(0);
    expect(e1.deltaVsPrevKg).toBeNull();
    expect(e1.deltaVsPrevPct).toBeNull();
    expect(e1.weekIndex).toBe(1);

    expect(e2.e1rm).toBeCloseTo(99.1667, 3);
    expect(e2.deltaVsStartKg).toBeCloseTo(5.8333, 3);
    expect(e2.deltaVsStartPct).toBeCloseTo(6.25, 6);
    expect(e2.deltaVsPrevKg).toBeCloseTo(5.8333, 3);
    expect(e2.deltaVsPrevPct).toBeCloseTo(6.25, 6);
    expect(e2.weekIndex).toBe(2);

    expect(e3.e1rm).toBeCloseTo(105, 6);
    expect(e3.deltaVsStartKg).toBeCloseTo(11.6667, 3);
    expect(e3.deltaVsStartPct).toBeCloseTo(12.5, 6);
    expect(e3.deltaVsPrevKg).toBeCloseTo(5.8333, 3);
    expect(e3.deltaVsPrevPct).toBeCloseTo(5.88235, 4);
    expect(e3.weekIndex).toBe(3);
  });

  it("ignores a warm-up set with higher e1RM", () => {
    const s = session({
      id: "s1",
      templateId: "t1",
      date: "2026-01-05",
      exercises: [exercise("Bench", [set("100", "10", { type: "Warm-up" }), set("60", "5")])],
    });
    const row = computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].rows[0];
    expect(row.entries).toHaveLength(1);
    expect(row.entries[0].bestSet).toEqual({ weight: 60, reps: 5 });
    expect(row.entries[0].e1rm).toBeCloseTo(70, 6);
  });

  it("ignores sets that are not completed", () => {
    const s = session({
      id: "s1",
      templateId: "t1",
      date: "2026-01-05",
      exercises: [exercise("Bench", [set("80", "5", { completed: false }), set("70", "5")])],
    });
    const row = computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].rows[0];
    expect(row.entries[0].bestSet).toEqual({ weight: 70, reps: 5 });
  });

  it("gives an exercise added mid-block its own baseline", () => {
    const sessions = [
      benchSession("s1", "2026-01-05", "80"),
      benchSession("s2", "2026-01-12", "85"),
      session({
        id: "s3",
        templateId: "t1",
        date: "2026-01-19",
        exercises: [exercise("Bench", [set("90", "5")]), exercise("Fly", [set("20", "10")])],
      }),
    ];
    const rows = computeBlockProgress(block("2026-01-05"), sessions, {}).groups[0].rows;
    const bench = rows.find((r) => r.exerciseName === "Bench");
    const fly = rows.find((r) => r.exerciseName === "Fly");

    expect(fly?.entries).toHaveLength(1);
    expect(fly?.entries[0].weekIndex).toBe(3);
    expect(fly?.entries[0].deltaVsStartKg).toBe(0);
    expect(fly?.entries[0].deltaVsStartPct).toBe(0);
    expect(fly?.entries[0].deltaVsPrevKg).toBeNull();
    expect(fly?.sessionsInBlock).toBe(1);

    expect(bench?.entries).toHaveLength(3);
    expect(bench?.entries[0].e1rm).toBeCloseTo(93.3333, 3);
    expect(bench?.entries[2].deltaVsStartPct).toBeCloseTo(12.5, 6);
    expect(bench?.sessionsInBlock).toBe(3);
  });

  it("keeps the same exercise in two templates as two separate series", () => {
    const sessions = [
      benchSession("a1", "2026-01-05", "80", "t1"),
      benchSession("b1", "2026-01-06", "100", "t2"),
      benchSession("b2", "2026-01-13", "105", "t2"),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, { t1: "Push A", t2: "Push B" });
    expect(result.groups).toHaveLength(2);

    const t1 = result.groups.find((g) => g.templateId === "t1");
    const t2 = result.groups.find((g) => g.templateId === "t2");
    expect(t1?.rows[0].key).toBe("t1::Bench");
    expect(t2?.rows[0].key).toBe("t2::Bench");

    expect(t1?.rows[0].entries).toHaveLength(1);
    expect(t1?.rows[0].entries[0].deltaVsStartKg).toBe(0);
    expect(t1?.rows[0].entries[0].e1rm).toBeCloseTo(epley(80, 5), 6);

    expect(t2?.rows[0].entries).toHaveLength(2);
    expect(t2?.rows[0].entries[0].e1rm).toBeCloseTo(epley(100, 5), 6);
    expect(t2?.rows[0].entries[0].deltaVsStartKg).toBe(0);
    expect(t2?.rows[0].entries[1].deltaVsStartPct).toBeCloseTo(5, 6);
    expect(result.ranking).toHaveLength(2);
  });

  it("trims exercise names for the series key", () => {
    const s = session({
      id: "s1",
      templateId: "t1",
      date: "2026-01-05",
      exercises: [exercise("  Bench ", [set("80", "5")])],
    });
    const row = computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].rows[0];
    expect(row.key).toBe("t1::Bench");
    expect(row.exerciseName).toBe("Bench");
  });

  it("restarts the series when an exercise is renamed mid-block", () => {
    const sessions = [
      benchSession("s1", "2026-01-05", "80"),
      benchSession("s2", "2026-01-12", "85"),
      session({
        id: "s3",
        templateId: "t1",
        date: "2026-01-19",
        exercises: [exercise("Bench Press", [set("100", "5")])],
      }),
    ];
    const rows = computeBlockProgress(block("2026-01-05"), sessions, {}).groups[0].rows;
    expect(rows).toHaveLength(2);

    const old = rows.find((r) => r.exerciseName === "Bench");
    const renamed = rows.find((r) => r.exerciseName === "Bench Press");
    expect(old?.entries).toHaveLength(2);
    expect(old?.entries[1].dateKey).toBe("2026-01-12");
    expect(renamed?.entries).toHaveLength(1);
    expect(renamed?.entries[0].e1rm).toBeCloseTo(epley(100, 5), 6);
    expect(renamed?.entries[0].deltaVsStartKg).toBe(0);
    expect(renamed?.entries[0].deltaVsPrevKg).toBeNull();
    expect(renamed?.entries[0].weekIndex).toBe(3);
  });

  it("skips a session without valid working set but counts it in sessionsInBlock", () => {
    const sessions = [
      session({
        id: "s1",
        templateId: "t1",
        date: "2026-01-05",
        exercises: [exercise("Bench", [set("80", "5", { completed: false })])],
      }),
      benchSession("s2", "2026-01-12", "80"),
      benchSession("s3", "2026-01-19", "90"),
    ];
    const group = computeBlockProgress(block("2026-01-05"), sessions, {}).groups[0];
    const row = group.rows[0];

    expect(row.sessionsInBlock).toBe(3);
    expect(row.entries).toHaveLength(2);
    expect(row.entries[0].dateKey).toBe("2026-01-12");
    expect(row.entries[0].weekIndex).toBe(2);
    expect(row.entries[0].deltaVsStartKg).toBe(0);
    expect(row.entries[0].deltaVsPrevKg).toBeNull();
    expect(row.entries[1].deltaVsStartPct).toBeCloseTo(12.5, 6);
    expect(row.verdict.status).toBe("up");
    expect(row.verdict.sampleSize).toBe(1);
    // Nothing was completed, so the exercise is not "unrated" either.
    expect(group.unratedExercises).toEqual([]);
  });

  it("does not show a bodyweight exercise as a row but lists it as unrated", () => {
    const sessions = [
      session({
        id: "s1",
        templateId: "t1",
        date: "2026-01-05",
        exercises: [
          exercise("Pull-up", [set("0", "10"), set("", "8")]),
          exercise("Dip", [set("20", "10")]),
        ],
      }),
      session({
        id: "s2",
        templateId: "t1",
        date: "2026-01-12",
        exercises: [exercise("Pull-up", [set("", "12")]), exercise("Dip", [set("25", "10")])],
      }),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, { t1: "Pull" });
    const group = result.groups[0];

    expect(group.rows.map((r) => r.exerciseName)).toEqual(["Dip"]);
    expect(group.unratedExercises).toEqual(["Pull-up"]);
    expect(result.ranking.map((r) => r.exerciseName)).toEqual(["Dip"]);

    const numbers = collectNumbers(result);
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers.every((n) => Number.isFinite(n))).toBe(true);
  });

  it("handles only-bodyweight blocks without NaN or Infinity", () => {
    const sessions = [
      session({
        id: "s1",
        templateId: "t1",
        date: "2026-01-05",
        exercises: [exercise("Pull-up", [set("0", "10")])],
      }),
      session({
        id: "s2",
        templateId: "t1",
        date: "2026-01-12",
        exercises: [exercise("Pull-up", [set("", "12")])],
      }),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, {});
    expect(result.groups[0].rows).toEqual([]);
    expect(result.groups[0].unratedExercises).toEqual(["Pull-up"]);
    expect(result.ranking).toEqual([]);
    expect(collectNumbers(result).every((n) => Number.isFinite(n))).toBe(true);
  });

  it("does not list an exercise as unrated when it was loaded in another session", () => {
    const sessions = [
      session({
        id: "s1",
        templateId: "t1",
        date: "2026-01-05",
        exercises: [exercise("Pull-up", [set("0", "10")])],
      }),
      session({
        id: "s2",
        templateId: "t1",
        date: "2026-01-12",
        exercises: [exercise("Pull-up", [set("10", "8")])],
      }),
    ];
    const group = computeBlockProgress(block("2026-01-05"), sessions, {}).groups[0];
    expect(group.rows).toHaveLength(1);
    expect(group.rows[0].entries).toHaveLength(1);
    expect(group.rows[0].sessionsInBlock).toBe(2);
    expect(group.unratedExercises).toEqual([]);
  });

  it("flags e1RM as unreliable only above 12 reps", () => {
    const sessions = [12, 13].map((reps, i) =>
      session({
        id: `s${i}`,
        templateId: `t${i}`,
        date: "2026-01-05",
        exercises: [exercise("Curl", [set("20", String(reps))])],
      }),
    );
    const result = computeBlockProgress(block("2026-01-05"), sessions, {});
    const t0 = result.groups.find((g) => g.templateId === "t0");
    const t1 = result.groups.find((g) => g.templateId === "t1");
    expect(t0?.rows[0].entries[0].e1rmUnreliable).toBe(false);
    expect(t1?.rows[0].entries[0].e1rmUnreliable).toBe(true);
  });

  it("caps reps at 15 for e1RM so 20 reps equals 15 reps", () => {
    const e15 = getBestBlockSet([set("40", "15")])?.e1rm;
    const e20 = getBestBlockSet([set("40", "20")])?.e1rm;
    expect(e15).toBeCloseTo(60, 6);
    expect(e20).toBeCloseTo(60, 6);

    const s = session({
      id: "s1",
      templateId: "t1",
      date: "2026-01-05",
      exercises: [exercise("Curl", [set("40", "20")])],
    });
    const entry = computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].rows[0].entries[0];
    expect(entry.e1rm).toBeCloseTo(60, 6);
    expect(entry.bestSet.reps).toBe(20);
    expect(entry.e1rmUnreliable).toBe(true);
  });

  it("creates two entries for two sessions of one template on the same day, ordered by startedAt", () => {
    const evening = session({
      id: "evening",
      templateId: "t1",
      date: "2026-01-05",
      time: "18:00",
      exercises: [exercise("Bench", [set("85", "5")])],
    });
    const morning = session({
      id: "morning",
      templateId: "t1",
      date: "2026-01-05",
      time: "08:00",
      exercises: [exercise("Bench", [set("80", "5")])],
    });
    // Passed in reverse order on purpose.
    const row = computeBlockProgress(block("2026-01-05"), [evening, morning], {}).groups[0].rows[0];

    expect(row.entries.map((e) => e.sessionId)).toEqual(["morning", "evening"]);
    expect(row.entries[0].weekIndex).toBe(1);
    expect(row.entries[1].weekIndex).toBe(1);
    expect(row.entries[1].deltaVsPrevPct).toBeCloseTo(6.25, 6);
    expect(row.sessionsInBlock).toBe(2);
  });

  it("merges an exercise listed twice in one session into one entry with the best set", () => {
    const s = session({
      id: "s1",
      templateId: "t1",
      date: "2026-01-05",
      exercises: [exercise("Bench", [set("80", "5")]), exercise("Bench", [set("90", "5")])],
    });
    const row = computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].rows[0];
    expect(row.entries).toHaveLength(1);
    expect(row.sessionsInBlock).toBe(1);
    expect(row.entries[0].bestSet).toEqual({ weight: 90, reps: 5 });
  });
});

describe("computeBlockProgress: session filtering", () => {
  it("ignores and counts sessions without templateId; skips startedAt 0 and active sessions", () => {
    const valid = benchSession("valid", "2026-01-05", "80");
    const noTemplate = session({
      id: "no-template",
      date: "2026-01-06",
      exercises: [exercise("Bench", [set("90", "5")])],
    });
    const noTemplateOutside = session({
      id: "no-template-outside",
      date: "2026-03-01",
      exercises: [exercise("Bench", [set("90", "5")])],
    });
    const zeroStart = session({
      id: "zero",
      templateId: "t1",
      date: "2026-01-07",
      startedAt: 0,
      exercises: [exercise("Bench", [set("90", "5")])],
    });
    const active = session({
      id: "active",
      templateId: "t1",
      date: "2026-01-08",
      status: "active",
      exercises: [exercise("Bench", [set("90", "5")])],
    });

    const result = computeBlockProgress(
      block("2026-01-05"),
      [valid, noTemplate, noTemplateOutside, zeroStart, active],
      {},
    );
    expect(result.ignoredSessions).toBe(1);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].rows[0].entries).toHaveLength(1);
    expect(result.groups[0].rows[0].sessionsInBlock).toBe(1);
  });

  describe("window boundaries (start 2026-01-05, 4 weeks)", () => {
    const b = block("2026-01-05");

    it("excludes the day before the start", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-01-04", time: "23:59", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual([]);
    });

    it("includes the start day at 00:00", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-01-05", time: "00:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual(["2026-01-05"]);
    });

    it("includes the last block day at 23:59", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-02-01", time: "23:59", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual(["2026-02-01"]);
    });

    it("excludes the day start + 28 days", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-02-02", time: "00:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual([]);
    });

    it("reports windowStart and windowEnd", () => {
      const result = computeBlockProgress(b, [], {});
      expect(result.windowStart).toBe("2026-01-05");
      expect(result.windowEnd).toBe("2026-02-02");
    });
  });

  describe("window with DST end (start 2026-10-05, 4 weeks, change on 2026-10-25)", () => {
    const b = block("2026-10-05");

    it("includes the DST day and the last block day 2026-11-01", () => {
      const sessions = [
        session({ id: "dst", templateId: "t1", date: "2026-10-25", time: "12:00", exercises: [exercise("Bench", [set("80", "5")])] }),
        session({ id: "last", templateId: "t1", date: "2026-11-01", time: "23:59", exercises: [exercise("Bench", [set("85", "5")])] }),
      ];
      const row = computeBlockProgress(b, sessions, {}).groups[0].rows[0];
      expect(row.entries.map((e) => e.dateKey)).toEqual(["2026-10-25", "2026-11-01"]);
      // Day 20 -> week 3, day 27 -> week 4
      expect(row.entries.map((e) => e.weekIndex)).toEqual([3, 4]);
    });

    it("excludes 2026-11-02 and reports it as windowEnd", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-11-02", time: "00:00", exercises: [exercise("Bench", [set("80", "5")])] });
      const result = computeBlockProgress(b, [s], {});
      expect(result.windowEnd).toBe("2026-11-02");
      expect(result.groups).toEqual([]);
    });

    it("includes the first block day at 00:00", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-10-05", time: "00:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual(["2026-10-05"]);
    });
  });

  describe("window with spring DST (start 2026-03-23, 4 weeks, change on 2026-03-29)", () => {
    it("places 2026-03-29 in week 1 and 2026-03-30 in week 2", () => {
      const sessions = [
        session({ id: "a", templateId: "t1", date: "2026-03-29", time: "12:00", exercises: [exercise("Bench", [set("80", "5")])] }),
        session({ id: "b", templateId: "t1", date: "2026-03-30", time: "12:00", exercises: [exercise("Bench", [set("85", "5")])] }),
      ];
      const row = computeBlockProgress(block("2026-03-23"), sessions, {}).groups[0].rows[0];
      expect(row.entries.map((e) => e.weekIndex)).toEqual([1, 2]);
    });
  });

  describe("endedAt", () => {
    const b = block("2026-01-05", 4, "2026-01-14");

    it("includes a session on the endedAt day", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-01-14", time: "23:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual(["2026-01-14"]);
    });

    it("excludes a session on the day after endedAt", () => {
      const s = session({ id: "s", templateId: "t1", date: "2026-01-15", time: "08:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(b, [s])).toEqual([]);
      expect(computeBlockProgress(b, [s], {}).windowEnd).toBe("2026-01-15");
    });

    it("does not extend the window when endedAt is after the planned end", () => {
      const late = block("2026-01-05", 4, "2026-03-01");
      const s = session({ id: "s", templateId: "t1", date: "2026-02-02", time: "12:00", exercises: [exercise("Bench", [set("80", "5")])] });
      expect(entryDates(late, [s])).toEqual([]);
      expect(computeBlockProgress(late, [s], {}).windowEnd).toBe("2026-02-02");
    });
  });

  it("returns an empty result for an empty session list", () => {
    const result = computeBlockProgress(block("2026-01-05", 8), [], {});
    expect(result).toEqual({
      windowStart: "2026-01-05",
      windowEnd: "2026-03-02",
      groups: [],
      ranking: [],
      ignoredSessions: 0,
    });
  });
});

describe("computeBlockVerdict", () => {
  it("is insufficient for 0 and 1 entries", () => {
    const expected = {
      status: "insufficient",
      startAvg: null,
      endAvg: null,
      deltaKg: null,
      deltaPct: null,
      sampleSize: 0,
    };
    expect(computeBlockVerdict([])).toEqual(expected);
    expect(computeBlockVerdict([blockEntry(100)])).toEqual(expected);
  });

  it("compares first vs last for n=2", () => {
    const v = computeBlockVerdict([blockEntry(100), blockEntry(110)]);
    expect(v.status).toBe("up");
    expect(v.sampleSize).toBe(1);
    expect(v.startAvg).toBeCloseTo(100, 6);
    expect(v.endAvg).toBeCloseTo(110, 6);
    expect(v.deltaKg).toBeCloseTo(10, 6);
    expect(v.deltaPct).toBeCloseTo(10, 6);
  });

  it("ignores the middle entry for n=3", () => {
    const v = computeBlockVerdict([blockEntry(100), blockEntry(500), blockEntry(110)]);
    expect(v.sampleSize).toBe(1);
    expect(v.startAvg).toBeCloseTo(100, 6);
    expect(v.endAvg).toBeCloseTo(110, 6);
    expect(v.deltaPct).toBeCloseTo(10, 6);
  });

  it("averages first 2 vs last 2 for n=4", () => {
    const v = computeBlockVerdict([100, 104, 106, 110].map(blockEntry));
    expect(v.sampleSize).toBe(2);
    expect(v.startAvg).toBeCloseTo(102, 6);
    expect(v.endAvg).toBeCloseTo(108, 6);
    expect(v.deltaKg).toBeCloseTo(6, 6);
    expect(v.deltaPct).toBeCloseTo(5.88235, 4);
    expect(v.status).toBe("up");
  });

  it("ignores the middle entry for n=5", () => {
    const v = computeBlockVerdict([100, 104, 999, 106, 110].map(blockEntry));
    expect(v.sampleSize).toBe(2);
    expect(v.startAvg).toBeCloseTo(102, 6);
    expect(v.endAvg).toBeCloseTo(108, 6);
  });

  it("averages first 2 vs last 2 for n=6 and ignores the middle", () => {
    const v = computeBlockVerdict([100, 104, 50, 200, 108, 112].map(blockEntry));
    expect(v.sampleSize).toBe(2);
    expect(v.startAvg).toBeCloseTo(102, 6);
    expect(v.endAvg).toBeCloseTo(110, 6);
    expect(v.deltaKg).toBeCloseTo(8, 6);
    expect(v.deltaPct).toBeCloseTo(7.84314, 4);
    expect(v.status).toBe("up");
  });

  it("reports down for a decline", () => {
    const v = computeBlockVerdict([100, 90].map(blockEntry));
    expect(v.status).toBe("down");
    expect(v.deltaKg).toBeCloseTo(-10, 6);
    expect(v.deltaPct).toBeCloseTo(-10, 6);
  });

  it("is flat just below +1 %", () => {
    expect(computeBlockVerdict([100, 100.99].map(blockEntry)).status).toBe("flat");
  });

  it("is up at exactly +1 % and above", () => {
    expect(computeBlockVerdict([100, 101].map(blockEntry)).status).toBe("up");
    expect(computeBlockVerdict([100, 101.5].map(blockEntry)).status).toBe("up");
  });

  it("is flat just above -1 %", () => {
    expect(computeBlockVerdict([100, 99.01].map(blockEntry)).status).toBe("flat");
  });

  it("is down at exactly -1 % and below", () => {
    expect(computeBlockVerdict([100, 99].map(blockEntry)).status).toBe("down");
    expect(computeBlockVerdict([100, 98].map(blockEntry)).status).toBe("down");
  });

  it("is flat for no change", () => {
    expect(computeBlockVerdict([100, 100].map(blockEntry)).status).toBe("flat");
  });
});

describe("computeBlockProgress: ranking", () => {
  it("sorts by gain descending, declines after gains, insufficient last", () => {
    const sessions = [
      session({
        id: "s1",
        templateId: "t1",
        date: "2026-01-05",
        exercises: [
          exercise("Charlie", [set("100", "5")]),
          exercise("Bravo", [set("100", "5")]),
          exercise("Alpha", [set("100", "5")]),
        ],
      }),
      session({
        id: "s2",
        templateId: "t1",
        date: "2026-01-12",
        exercises: [
          exercise("Charlie", [set("90", "5")]),
          exercise("Bravo", [set("105", "5")]),
          exercise("Alpha", [set("110", "5")]),
        ],
      }),
      // Single session in another template -> insufficient.
      session({
        id: "s3",
        templateId: "t2",
        date: "2026-01-06",
        exercises: [exercise("Delta", [set("50", "5")])],
      }),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, {});

    expect(result.ranking.map((r) => r.exerciseName)).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
    expect(result.ranking[0].verdict.deltaPct).toBeCloseTo(10, 6);
    expect(result.ranking[1].verdict.deltaPct).toBeCloseTo(5, 6);
    expect(result.ranking[2].verdict.deltaPct).toBeCloseTo(-10, 6);
    expect(result.ranking[3].verdict.status).toBe("insufficient");
    expect(result.ranking[3].verdict.deltaPct).toBeNull();
  });
});

describe("computeBlockProgress: group labels", () => {
  it("uses templateNames, then the newest session name, then the deleted-template label", () => {
    const sessions = [
      session({ id: "a1", templateId: "t1", date: "2026-01-05", name: "Session A", exercises: [exercise("Bench", [set("80", "5")])] }),
      session({ id: "b1", templateId: "t2", date: "2026-01-06", name: "Legs (old)", exercises: [exercise("Squat", [set("100", "5")])] }),
      session({ id: "b2", templateId: "t2", date: "2026-01-13", name: "Legs", exercises: [exercise("Squat", [set("105", "5")])] }),
      // Newer name, but outside the window: must not be used.
      session({ id: "b3", templateId: "t2", date: "2026-03-01", name: "Outside", exercises: [exercise("Squat", [set("110", "5")])] }),
      session({ id: "c1", templateId: "t3", date: "2026-01-07", name: "", exercises: [exercise("Row", [set("60", "5")])] }),
    ];
    const result = computeBlockProgress(block("2026-01-05"), sessions, { t1: "Push Day" });
    const label = (id: string): string | undefined => result.groups.find((g) => g.templateId === id)?.label;

    expect(label("t1")).toBe("Push Day");
    expect(label("t2")).toBe("Legs");
    expect(label("t3")).toBe(DELETED_TEMPLATE_LABEL);
  });

  it("treats a whitespace-only session name as empty", () => {
    const s = session({ id: "c1", templateId: "t3", date: "2026-01-07", name: "   ", exercises: [exercise("Row", [set("60", "5")])] });
    expect(computeBlockProgress(block("2026-01-05"), [s], {}).groups[0].label).toBe(DELETED_TEMPLATE_LABEL);
  });
});
