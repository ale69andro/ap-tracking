import { describe, expect, it } from "vitest";
import type { ExercisePrescription, ExerciseSet, SessionExercise, TemplateExercise, WorkoutSession } from "@/app/types";
import { hasStructureChanged, mergeSessionVariantsIntoTemplate, refillSetsForVariant } from "@/app/lib/workout";
import { withExerciseVariant } from "@/app/lib/exerciseVariant";
import { exercise, session, set } from "@/lib/analysis/__fixtures__/blockFixtures";

const BENCH = "Bench";
const BENCH_UNI = withExerciseVariant(BENCH, "unilateral");
const ROW = "Row";
const ROW_UNI = withExerciseVariant(ROW, "unilateral");

/** Open (not yet completed) set, pre-filled with a value from the other variant. */
function open(weight: string, reps: string, opts: Partial<ExerciseSet> = {}): ExerciseSet {
  return set(weight, reps, { completed: false, ...opts });
}

function prescription(overrides: Partial<ExercisePrescription> = {}): ExercisePrescription {
  return {
    id: "rx-1",
    user_id: "u1",
    exercise_name: BENCH_UNI,
    template_id: null,
    target_weight: 35,
    target_reps_min: 6,
    target_reps_max: 8,
    target_sets: null,
    action: "increase_load",
    confidence: "high",
    reason: null,
    accepted_at: "2026-01-01T00:00:00.000Z",
    consumed_at: null,
    ...overrides,
  };
}

function values(sets: ExerciseSet[]): string[] {
  return sets.map((s) => `${s.weight}x${s.reps}`);
}

/** Everything about a set that a refill must never change. */
function structure(sets: ExerciseSet[]): unknown[] {
  return sets.map((s) => ({ id: s.id, type: s.type, restSeconds: s.restSeconds, completed: s.completed }));
}

describe("refillSetsForVariant", () => {
  it("returns completed sets untouched, also with a prescription", () => {
    const sets = [
      set("40", "10", { type: "Warm-up", completedAt: 1000 }),
      set("100", "5", { completedAt: 2000 }),
    ];
    const previous = exercise(BENCH_UNI, [set("20", "10", { type: "Warm-up" }), set("30", "8")]);

    const result = refillSetsForVariant(sets, previous, prescription());

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(sets[0]);
    expect(result[1]).toBe(sets[1]);
  });

  it("clears open sets when the new variant has no history", () => {
    // "100"/"5" is the bilateral prefill that must not survive the switch.
    const sets = [open("40", "10", { type: "Warm-up" }), open("100", "5"), open("100", "5")];

    expect(values(refillSetsForVariant(sets, undefined))).toEqual(["x", "x", "x"]);
    expect(values(refillSetsForVariant(sets, exercise(BENCH_UNI, [])))).toEqual(["x", "x", "x"]);
  });

  it("fills open sets from the previous exercise by set type and position within the type", () => {
    const previous = exercise(BENCH_UNI, [
      set("20", "10", { type: "Warm-up" }),
      set("30", "8"),
      set("32", "7"),
      set("34", "6"),
    ]);
    const sets = [
      open("40", "10", { type: "Warm-up" }),
      set("100", "5"), // completed: first Normal set, still counts for the position
      open("100", "5"),
      open("100", "5"),
    ];

    // Second and third Normal set take the second and third previous Normal set.
    expect(values(refillSetsForVariant(sets, previous))).toEqual(["20x10", "100x5", "32x7", "34x6"]);
  });

  it("uses the last previous set of the type for additional open sets", () => {
    const previous = exercise(BENCH_UNI, [set("30", "8"), set("32", "7")]);
    const sets = [open("100", "5"), open("100", "5"), open("100", "5"), open("100", "5")];

    expect(values(refillSetsForVariant(sets, previous))).toEqual(["30x8", "32x7", "32x7", "32x7"]);
  });

  it("clears an open set whose type the previous exercise does not contain", () => {
    const previous = exercise(BENCH_UNI, [set("30", "8")]);
    const sets = [open("40", "10", { type: "Warm-up" }), open("100", "5"), open("80", "10", { type: "Drop Set" })];

    expect(values(refillSetsForVariant(sets, previous))).toEqual(["x", "30x8", "x"]);
  });

  it("applies the prescription to open working sets only and never changes the set count", () => {
    const previous = exercise(BENCH_UNI, [set("20", "10", { type: "Warm-up" }), set("30", "8"), set("30", "8")]);
    const sets = [
      open("40", "10", { type: "Warm-up" }),
      set("100", "5"),
      open("100", "5"),
      open("80", "10", { type: "Drop Set" }),
    ];

    const result = refillSetsForVariant(sets, previous, prescription({ target_sets: 5 }));

    // Warm-up keeps the refilled value, the completed set its own, open working sets get 35 x 6.
    expect(values(result)).toEqual(["20x10", "100x5", "35x6", "35x6"]);
  });

  it("applies the prescription even when the new variant has no history", () => {
    const sets = [open("40", "10", { type: "Warm-up" }), open("100", "5")];

    expect(values(refillSetsForVariant(sets, undefined, prescription()))).toEqual(["x", "35x6"]);
  });

  it("keeps the refilled weight when the prescription has no target weight", () => {
    const previous = exercise(BENCH_UNI, [set("30", "8"), set("32", "7")]);
    const sets = [open("100", "5"), open("100", "5")];

    const result = refillSetsForVariant(sets, previous, prescription({ target_weight: null }));

    expect(values(result)).toEqual(["30x6", "32x6"]);
  });

  it("preserves ids, types, rest, completion and order, and does not mutate its input", () => {
    const previous = exercise(BENCH_UNI, [set("20", "10", { type: "Warm-up" }), set("30", "8"), set("32", "7")]);
    const sets = [
      open("40", "10", { type: "Warm-up", restSeconds: 30 }),
      set("100", "5", { restSeconds: 90, completedAt: 1000 }),
      open("100", "5", { restSeconds: 120 }),
      open("80", "10", { type: "Drop Set", restSeconds: 90 }),
    ];
    const before = structuredClone(sets);
    const previousBefore = structuredClone(previous);

    for (const rx of [undefined, prescription({ target_sets: 6 })]) {
      for (const prev of [undefined, previous]) {
        const result = refillSetsForVariant(sets, prev, rx);
        expect(structure(result)).toEqual(structure(before));
      }
    }
    expect(sets).toEqual(before);
    expect(previous).toEqual(previousBefore);
  });
});

function tpl(name: string, extra: Partial<TemplateExercise> = {}): TemplateExercise {
  return {
    name,
    muscleGroups: ["Chest"],
    sets: 3,
    targetReps: 8,
    targetRepsMin: 6,
    targetRepsMax: 10,
    restSeconds: 90,
    startWeight: "60",
    notes: "note",
    ...extra,
  };
}

function performed(...names: string[]): Pick<SessionExercise, "exerciseName">[] {
  return names.map((exerciseName) => ({ exerciseName }));
}

describe("mergeSessionVariantsIntoTemplate", () => {
  it("returns null when every template exercise was done under its own name", () => {
    expect(mergeSessionVariantsIntoTemplate([tpl(BENCH), tpl(ROW_UNI)], performed(ROW_UNI, BENCH))).toBeNull();
  });

  it("returns null when the session has no counterpart for the template", () => {
    expect(mergeSessionVariantsIntoTemplate([tpl(BENCH)], performed("Squat"))).toBeNull();
    expect(mergeSessionVariantsIntoTemplate([tpl(BENCH)], [])).toBeNull();
    expect(mergeSessionVariantsIntoTemplate([], performed(BENCH_UNI))).toBeNull();
  });

  it("renames a template exercise that was done unilaterally and drops its start weight", () => {
    const result = mergeSessionVariantsIntoTemplate([tpl(BENCH)], performed(BENCH_UNI));

    expect(result).toHaveLength(1);
    const renamed = result?.[0];
    expect(renamed).toEqual({
      name: BENCH_UNI,
      muscleGroups: ["Chest"],
      sets: 3,
      targetReps: 8,
      targetRepsMin: 6,
      targetRepsMax: 10,
      restSeconds: 90,
      notes: "note",
    });
    expect(renamed && "startWeight" in renamed).toBe(false);
  });

  it("renames a unilateral template exercise back when it was done bilaterally", () => {
    const result = mergeSessionVariantsIntoTemplate([tpl(BENCH_UNI, { startWeight: "25" })], performed(BENCH));

    expect(result?.[0].name).toBe(BENCH);
    expect(result?.[0] && "startWeight" in result[0]).toBe(false);
    expect(result?.[0].targetRepsMax).toBe(10);
  });

  it("leaves the other template exercises as they were, including their start weight", () => {
    const template = [tpl("Fly", { startWeight: "12" }), tpl(BENCH), tpl("Dip", { startWeight: "0" })];

    const result = mergeSessionVariantsIntoTemplate(template, performed("Fly", BENCH_UNI, "Dip"));

    expect(result?.[0]).toEqual(template[0]);
    expect(result?.[2]).toEqual(template[2]);
    expect(result?.[1].name).toBe(BENCH_UNI);
  });

  it("keeps template order and length and never adds or removes exercises", () => {
    const template = [tpl("Fly"), tpl(BENCH), tpl("Dip")];

    // Session order differs, has an extra exercise, and skipped "Dip".
    const result = mergeSessionVariantsIntoTemplate(template, performed("Curl", BENCH_UNI, "Fly"));

    expect(result?.map((e) => e.name)).toEqual(["Fly", BENCH_UNI, "Dip"]);
  });

  it("does not rename the bilateral entry when the template already lists both variants", () => {
    // Only the unilateral one was done: it is claimed by its exact match.
    expect(mergeSessionVariantsIntoTemplate([tpl(ROW), tpl(ROW_UNI)], performed(ROW_UNI))).toBeNull();
    expect(mergeSessionVariantsIntoTemplate([tpl(ROW_UNI), tpl(ROW)], performed(ROW_UNI))).toBeNull();
  });

  it("renames exactly one of two identically named template exercises", () => {
    const result = mergeSessionVariantsIntoTemplate([tpl(ROW), tpl(ROW)], performed(ROW_UNI, ROW));

    expect(result?.map((e) => e.name).sort()).toEqual([ROW, ROW_UNI]);
  });

  it("adopts the session spelling but keeps the start weight when the variant did not flip", () => {
    const result = mergeSessionVariantsIntoTemplate([tpl("Bench (uni)", { startWeight: "25" })], performed(BENCH_UNI));

    expect(result?.[0].name).toBe(BENCH_UNI);
    expect(result?.[0].startWeight).toBe("25");
  });

  it("does not mutate its inputs", () => {
    const template = [tpl(BENCH), tpl(ROW)];
    const done = performed(BENCH_UNI, ROW);
    const templateBefore = structuredClone(template);
    const doneBefore = structuredClone(done);

    mergeSessionVariantsIntoTemplate(template, done);

    expect(template).toEqual(templateBefore);
    expect(done).toEqual(doneBefore);
  });
});

/** Session whose snapshot is taken from `atStart` and whose live exercises are `current`. */
function sessionWithSnapshot(atStart: SessionExercise[], current: SessionExercise[]): WorkoutSession {
  return {
    ...session({ id: "s1", templateId: "t1", date: "2026-01-05", status: "active", exercises: current }),
    originalExerciseStructure: atStart.map((ex) => ({
      exerciseName: ex.exerciseName,
      setCount: ex.sets.length,
      setTypes: ex.sets.map((s) => s.type),
    })),
  };
}

function twoSets(name: string): SessionExercise {
  return exercise(name, [open("", "", { type: "Warm-up" }), open("", "")]);
}

describe("hasStructureChanged", () => {
  it("does not treat a variant switch as a structure change", () => {
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH), twoSets(ROW)], [twoSets(BENCH_UNI), twoSets(ROW)]))).toBe(false);
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH_UNI)], [twoSets(BENCH)]))).toBe(false);
  });

  it("still detects a set count change on an exercise whose variant was switched", () => {
    const current = exercise(BENCH_UNI, [open("", "", { type: "Warm-up" }), open("", ""), open("", "")]);
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH)], [current]))).toBe(true);
  });

  it("still detects a different exercise, also when it is unilateral", () => {
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH)], [twoSets(ROW)]))).toBe(true);
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH)], [twoSets(ROW_UNI)]))).toBe(true);
  });

  it("still detects changed set count, set type, order and exercise count", () => {
    const start = [twoSets(BENCH), twoSets(ROW)];

    const extraSet = exercise(BENCH, [open("", "", { type: "Warm-up" }), open("", ""), open("", "")]);
    expect(hasStructureChanged(sessionWithSnapshot(start, [extraSet, twoSets(ROW)]))).toBe(true);

    const otherType = exercise(BENCH, [open("", ""), open("", "")]);
    expect(hasStructureChanged(sessionWithSnapshot(start, [otherType, twoSets(ROW)]))).toBe(true);

    expect(hasStructureChanged(sessionWithSnapshot(start, [twoSets(ROW), twoSets(BENCH)]))).toBe(true);
    expect(hasStructureChanged(sessionWithSnapshot(start, [twoSets(BENCH)]))).toBe(true);
  });

  it("returns false for an unchanged session and for a session without snapshot", () => {
    expect(hasStructureChanged(sessionWithSnapshot([twoSets(BENCH)], [twoSets(BENCH)]))).toBe(false);
    expect(hasStructureChanged(session({ id: "s2", date: "2026-01-05", exercises: [twoSets(BENCH_UNI)] }))).toBe(false);
  });
});
