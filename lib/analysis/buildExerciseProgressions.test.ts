import { describe, expect, it } from "vitest";
import type { ExerciseProgression, TemplateExercise, WorkoutSession, WorkoutTemplate } from "@/app/types";
import { getSessionDate } from "@/app/lib/dateUtils";
import { withExerciseVariant } from "@/app/lib/exerciseVariant";
import { getDefaultRepRange } from "@/app/lib/repRangeDefaults";
import { buildExerciseProgressions } from "@/lib/analysis/buildExerciseProgressions";
import { exercise, session, set } from "@/lib/analysis/__fixtures__/blockFixtures";

const BILATERAL = "Bench Press";
const UNILATERAL = withExerciseVariant(BILATERAL, "unilateral");

/** One session with a single exercise holding one completed working set. */
function single(id: string, date: string, name: string, weight: string, reps: string): WorkoutSession {
  return session({ id, date, exercises: [exercise(name, [set(weight, reps)])] });
}

// Bilateral around 100 kg x 5, unilateral around 30 kg x 8 (per side), on alternating days.
const BILATERAL_SESSIONS = [
  single("b1", "2026-01-05", BILATERAL, "100", "5"),
  single("b2", "2026-01-07", BILATERAL, "100", "5"),
  single("b3", "2026-01-12", BILATERAL, "100", "6"),
  single("b4", "2026-01-14", BILATERAL, "102.5", "5"),
  single("b5", "2026-01-19", BILATERAL, "102.5", "5"),
  single("b6", "2026-01-21", BILATERAL, "105", "5"),
];
const UNILATERAL_SESSIONS = [
  single("u1", "2026-01-06", UNILATERAL, "30", "8"),
  single("u2", "2026-01-08", UNILATERAL, "30", "8"),
  single("u3", "2026-01-13", UNILATERAL, "32", "8"),
  single("u4", "2026-01-15", UNILATERAL, "32", "8"),
  single("u5", "2026-01-20", UNILATERAL, "34", "8"),
];

/** The app passes history newest-first. */
function newestFirst(...groups: WorkoutSession[][]): WorkoutSession[] {
  return groups.flat().sort((a, b) => b.startedAt - a.startedAt);
}

function byName(progressions: ExerciseProgression[], name: string): ExerciseProgression | undefined {
  return progressions.find((p) => p.name === name);
}

function names(progressions: ExerciseProgression[]): string[] {
  return progressions.map((p) => p.name).sort();
}

function template(...exercises: TemplateExercise[]): WorkoutTemplate {
  return { id: "t1", name: "Push", exercises };
}

/** Every load value the coach shows or suggests for this exercise. */
function loadValues(p: ExerciseProgression | undefined): number[] {
  if (!p) return [];
  const candidates: (number | null | undefined)[] = [
    p.bestWeight,
    ...p.recentSessions.map((s) => s.topWeight),
    p.analysis?.currentE1RM,
    p.analysis?.previousE1RM,
    p.analysis?.suggestedNextWeight,
    p.analysis?.bestWeight,
    p.analysis?.lastTopSet?.weight,
    p.recommendation?.targetWeight,
  ];
  return candidates.filter((v): v is number => typeof v === "number");
}

describe("buildExerciseProgressions: bilateral and unilateral history", () => {
  const progressions = buildExerciseProgressions(newestFirst(BILATERAL_SESSIONS, UNILATERAL_SESSIONS));
  const bilateral = byName(progressions, BILATERAL);
  const unilateral = byName(progressions, UNILATERAL);

  it("keeps the two variants of an exercise in two progressions under their full names", () => {
    // Fails if grouping ever normalises names (e.g. strips the variant suffix).
    expect(names(progressions)).toEqual([BILATERAL, UNILATERAL]);
  });

  it("gives each progression only the sessions of its own variant", () => {
    // Last five sessions each, oldest first.
    expect(bilateral?.recentSessions.map((s) => s.topWeight)).toEqual([100, 100, 102.5, 102.5, 105]);
    expect(unilateral?.recentSessions.map((s) => s.topWeight)).toEqual([30, 30, 32, 32, 34]);

    const unilateralDates = UNILATERAL_SESSIONS.map(getSessionDate);
    expect(unilateral?.recentSessions.map((s) => s.date)).toEqual(unilateralDates);
    for (const s of bilateral?.recentSessions ?? []) {
      expect(unilateralDates).not.toContain(s.date);
    }
  });

  it("tracks the best weight per variant", () => {
    expect(bilateral?.bestWeight).toBe(105);
    expect(unilateral?.bestWeight).toBe(34);
  });

  it("derives every unilateral load value from the unilateral history only", () => {
    const loads = loadValues(unilateral);
    // Top e1RM is 34 x (1 + 8/30) = 43.07; anything from the bilateral history would be >= 100.
    expect(loads.length).toBeGreaterThan(5);
    for (const load of loads) expect(load).toBeLessThan(50);

    expect(unilateral?.recommendation?.targetWeight).not.toBeNull();
    expect(unilateral?.recommendation?.exerciseName).toBe(UNILATERAL);
    expect(unilateral?.analysis?.exerciseName).toBe(UNILATERAL);
  });

  it("derives every bilateral load value from the bilateral history only", () => {
    const loads = loadValues(bilateral);
    expect(loads.length).toBeGreaterThan(5);
    for (const load of loads) expect(load).toBeGreaterThan(90);

    expect(bilateral?.recommendation?.targetWeight).not.toBeNull();
  });

  it("recommends the next load from the last session of the same variant", () => {
    // Both variants progressed last session, so the next target is last top weight + 2.5 kg:
    // unilateral 34 + 2.5 = 36.5, bilateral 105 + 2.5 = 107.5.
    expect(unilateral?.recommendation?.targetWeight).toBeCloseTo(36.5, 6);
    expect(bilateral?.recommendation?.targetWeight).toBeCloseTo(107.5, 6);
  });
});

describe("buildExerciseProgressions: no leak between variants", () => {
  it("creates no unilateral progression from bilateral-only history", () => {
    const progressions = buildExerciseProgressions(newestFirst(BILATERAL_SESSIONS));
    expect(names(progressions)).toEqual([BILATERAL]);
    expect(byName(progressions, UNILATERAL)).toBeUndefined();
  });

  it("does not change the bilateral progression when unilateral sessions are added", () => {
    const alone = byName(buildExerciseProgressions(newestFirst(BILATERAL_SESSIONS)), BILATERAL);
    const mixed = byName(
      buildExerciseProgressions(newestFirst(BILATERAL_SESSIONS, UNILATERAL_SESSIONS)),
      BILATERAL,
    );
    // trendScore included: the bilateral best (105) is the global maximum in both cases.
    expect(alone).toBeDefined();
    expect(mixed).toEqual(alone);
  });

  it("keeps both variants apart when they are trained in the same workout", () => {
    const workout = session({
      id: "w1",
      date: "2026-01-05",
      exercises: [exercise(BILATERAL, [set("100", "5")]), exercise(UNILATERAL, [set("30", "8")])],
    });
    const progressions = buildExerciseProgressions([workout]);

    expect(names(progressions)).toEqual([BILATERAL, UNILATERAL]);
    expect(byName(progressions, BILATERAL)?.recentSessions.map((s) => s.topWeight)).toEqual([100]);
    expect(byName(progressions, UNILATERAL)?.recentSessions.map((s) => s.topWeight)).toEqual([30]);
  });
});

describe("buildExerciseProgressions: rep range per variant", () => {
  const history = newestFirst(BILATERAL_SESSIONS, UNILATERAL_SESSIONS);

  it("applies a template rep range on the unilateral exercise to that variant only", () => {
    const templates = [template({ name: UNILATERAL, muscleGroups: [], targetRepsMin: 8, targetRepsMax: 12 })];
    const progressions = buildExerciseProgressions(history, templates);

    expect(byName(progressions, UNILATERAL)?.repRange).toEqual({ min: 8, max: 12 });
    expect(byName(progressions, BILATERAL)?.repRange).toBeUndefined();
    for (const load of loadValues(byName(progressions, UNILATERAL))) expect(load).toBeLessThan(50);
  });

  it("applies a template rep range on the bilateral exercise to that variant only", () => {
    const templates = [template({ name: BILATERAL, muscleGroups: [], targetRepsMin: 4, targetRepsMax: 6 })];
    const progressions = buildExerciseProgressions(history, templates);

    expect(byName(progressions, BILATERAL)?.repRange).toEqual({ min: 4, max: 6 });
    expect(byName(progressions, UNILATERAL)?.repRange).toBeUndefined();
    for (const load of loadValues(byName(progressions, BILATERAL))) expect(load).toBeGreaterThan(90);
  });

  it("falls back to the base exercise's default rep range for a unilateral template exercise", () => {
    const templates = [template({ name: UNILATERAL, muscleGroups: [] })];
    const progressions = buildExerciseProgressions(history, templates);

    expect(byName(progressions, UNILATERAL)?.repRange).toEqual(getDefaultRepRange(BILATERAL));
  });
});

describe("buildExerciseProgressions: which sets count", () => {
  it("ignores warm-up, uncompleted and incomplete sets", () => {
    const workout = session({
      id: "w1",
      date: "2026-01-05",
      exercises: [
        exercise(BILATERAL, [
          set("60", "10", { type: "Warm-up" }),
          set("100", "5"),
          set("120", "3", { completed: false }),
          set("", "8"),
        ]),
      ],
    });
    const [progression] = buildExerciseProgressions([workout]);

    expect(progression.recentSessions).toHaveLength(1);
    // Only 100 x 5 counts: volume 500, e1RM 100 x (1 + 5/30) = 116.67.
    expect(progression.recentSessions[0].topWeight).toBe(100);
    expect(progression.recentSessions[0].topReps).toBe(5);
    expect(progression.recentSessions[0].totalVolume).toBe(500);
    expect(progression.recentSessions[0].setCount).toBe(1);
    expect(progression.recentSessions[0].score).toBeCloseTo(116.6667, 3);
  });

  it("creates no progression for an exercise without any counting set", () => {
    const workout = session({
      id: "w1",
      date: "2026-01-05",
      exercises: [
        exercise(UNILATERAL, [set("20", "10", { type: "Warm-up" }), set("30", "8", { completed: false })]),
      ],
    });
    expect(buildExerciseProgressions([workout])).toEqual([]);
  });
});
