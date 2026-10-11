import { describe, expect, it } from "vitest";
import { findBuiltIn, getExerciseRole } from "@/app/constants/exercises";
import { withExerciseVariant } from "@/app/lib/exerciseVariant";
import { getDefaultRepRange } from "@/app/lib/repRangeDefaults";
import { getIncrement } from "@/app/lib/recommendations";

// Three catalog entries with different equipment; "Spanish Squat" is a support exercise.
const CATALOG_NAMES = ["Bench Press", "Dumbbell Bench Press", "Spanish Squat"];
const EXPERIENCES = ["beginner", "intermediate", "advanced"] as const;

describe("findBuiltIn with a variant suffix", () => {
  it("resolves a unilateral name to the catalog entry of its base exercise", () => {
    for (const name of CATALOG_NAMES) {
      const entry = findBuiltIn(name);
      expect(entry?.name).toBe(name);
      expect(findBuiltIn(withExerciseVariant(name, "unilateral"))).toBe(entry);
    }
  });

  it("stays case-insensitive with the suffix", () => {
    const entry = findBuiltIn("Bench Press");
    expect(entry).toBeDefined();
    expect(findBuiltIn("bench press (uni)")).toBe(entry);
    expect(findBuiltIn("BENCH PRESS (UNI)")).toBe(entry);
  });

  it("still returns undefined for an unknown exercise, with or without suffix", () => {
    expect(findBuiltIn("Nonexistent Lift")).toBeUndefined();
    expect(findBuiltIn(withExerciseVariant("Nonexistent Lift", "unilateral"))).toBeUndefined();
  });

  it("leaves bilateral lookups unchanged", () => {
    expect(findBuiltIn("bench press")?.name).toBe("Bench Press");
    expect(findBuiltIn("Bench Press ")).toBeUndefined(); // names without suffix are not trimmed
  });
});

describe("catalog-derived values for a unilateral exercise", () => {
  it("uses the same role as the base exercise", () => {
    for (const name of CATALOG_NAMES) {
      expect(getExerciseRole(withExerciseVariant(name, "unilateral"))).toBe(getExerciseRole(name));
    }
    expect(getExerciseRole(withExerciseVariant("Spanish Squat", "unilateral"))).toBe("support");
    expect(getExerciseRole(withExerciseVariant("Bench Press", "unilateral"))).toBe("performance");
  });

  it("uses the same default rep range as the base exercise at every experience level", () => {
    for (const name of CATALOG_NAMES) {
      for (const experience of EXPERIENCES) {
        expect(getDefaultRepRange(withExerciseVariant(name, "unilateral"), experience)).toEqual(
          getDefaultRepRange(name, experience),
        );
      }
    }
    // Not just two fallbacks that happen to match: Bench Press differs from the fallback range.
    expect(getDefaultRepRange(withExerciseVariant("Bench Press", "unilateral"))).not.toEqual(
      getDefaultRepRange("Nonexistent Lift"),
    );
  });

  it("uses the same load increment as the base exercise", () => {
    const increments = CATALOG_NAMES.map((name) => {
      const base = findBuiltIn(name);
      const unilateral = findBuiltIn(withExerciseVariant(name, "unilateral"));
      expect(base).toBeDefined();
      expect(unilateral).toBeDefined();
      if (!base || !unilateral) return NaN;
      expect(getIncrement(unilateral.equipment)).toBe(getIncrement(base.equipment));
      return getIncrement(unilateral.equipment);
    });
    // Barbell 2.5, Dumbbell 2.0, Bodyweight 0 — the three entries really differ.
    expect(increments).toEqual([2.5, 2, 0]);
  });
});
