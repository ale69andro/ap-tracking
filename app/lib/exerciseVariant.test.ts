import { describe, expect, it } from "vitest";
import {
  UNILATERAL_NAME_SUFFIX,
  getBaseExerciseName,
  getExerciseVariant,
  isUnilateralName,
  withExerciseVariant,
} from "@/app/lib/exerciseVariant";

describe("names without a suffix", () => {
  it("treats a name without suffix as bilateral", () => {
    for (const name of ["Bench", " Bench ", "Row (Cable)", ""]) {
      expect(isUnilateralName(name)).toBe(false);
      expect(getExerciseVariant(name)).toBe("bilateral");
    }
  });

  it("returns a name without suffix unchanged, including surrounding whitespace", () => {
    for (const name of ["Bench", " Bench ", "Bench  ", "Row (Cable)", ""]) {
      expect(getBaseExerciseName(name)).toBe(name);
      expect(withExerciseVariant(name, "bilateral")).toBe(name);
    }
  });

  it("is not fooled by names that merely contain 'uni'", () => {
    for (const name of ["Unilateral Row", "Uni Press", "Row (Unilateral)", "(Uni) Row", "Row Uni"]) {
      expect(isUnilateralName(name)).toBe(false);
      expect(getBaseExerciseName(name)).toBe(name);
    }
  });
});

describe("unilateral names", () => {
  it("stores the unilateral variant as the name plus ' (Uni)'", () => {
    // Persisted inside exercise names: this literal must not change silently.
    expect(UNILATERAL_NAME_SUFFIX).toBe(" (Uni)");
    expect(withExerciseVariant("Bench", "unilateral")).toBe("Bench (Uni)");
  });

  it("reads a suffixed name as unilateral with the plain name as base", () => {
    const name = withExerciseVariant("Bench Press", "unilateral");
    expect(isUnilateralName(name)).toBe(true);
    expect(getExerciseVariant(name)).toBe("unilateral");
    expect(getBaseExerciseName(name)).toBe("Bench Press");
  });

  it("restores the exact original name when switching back to bilateral", () => {
    for (const name of ["Bench", "Row (Cable)", "Bench ", " Bench"]) {
      const unilateral = withExerciseVariant(name, "unilateral");
      expect(unilateral).not.toBe(name);
      expect(withExerciseVariant(unilateral, "bilateral")).toBe(name);
      expect(getBaseExerciseName(unilateral)).toBe(name);
    }
  });

  it("never appends the suffix twice", () => {
    const once = withExerciseVariant("Bench", "unilateral");
    expect(withExerciseVariant(once, "unilateral")).toBe(once);
    expect(withExerciseVariant(withExerciseVariant(once, "unilateral"), "unilateral")).toBe("Bench (Uni)");
  });

  it("detects the suffix regardless of case, missing space and trailing whitespace", () => {
    for (const name of ["Bench (uni)", "Bench (UNI)", "Bench(Uni)", "Bench (Uni) ", "Bench (Uni)\n"]) {
      expect(isUnilateralName(name)).toBe(true);
      expect(getBaseExerciseName(name)).toBe("Bench");
    }
  });

  it("writes the canonical spelling when a loosely spelled name is switched to unilateral", () => {
    expect(withExerciseVariant("Bench (uni)", "unilateral")).toBe("Bench (Uni)");
    expect(withExerciseVariant("Bench(UNI)", "unilateral")).toBe("Bench (Uni)");
  });

  it("strips a doubled suffix completely", () => {
    expect(getBaseExerciseName("Bench (Uni) (Uni)")).toBe("Bench");
    expect(withExerciseVariant("Bench (Uni) (Uni)", "unilateral")).toBe("Bench (Uni)");
  });
});
