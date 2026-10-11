import type { ExerciseVariant } from "@/app/types";

/**
 * A unilateral exercise is stored under its name plus this suffix. The name is
 * the exercise identity everywhere (history, coach, block, prescriptions, PRs),
 * so the suffixed name is a separate exercise with its own history.
 * No suffix = bilateral.
 *
 * This value is persisted inside exercise names — changing it orphans existing
 * unilateral history. Never build or strip it by hand; use the helpers below.
 */
export const UNILATERAL_NAME_SUFFIX = " (Uni)";

// Tolerant on read (case, missing space, trailing whitespace); writes always use
// the constant. At most one space is consumed before the suffix, so stripping
// restores the exact name the suffix was appended to.
const SUFFIX_PATTERN = /(?: ?\(uni\))+\s*$/i;

export function isUnilateralName(name: string): boolean {
  return SUFFIX_PATTERN.test(name);
}

export function getExerciseVariant(name: string): ExerciseVariant {
  return isUnilateralName(name) ? "unilateral" : "bilateral";
}

/** Name without the variant suffix. Names that carry no suffix are returned unchanged. */
export function getBaseExerciseName(name: string): string {
  return name.replace(SUFFIX_PATTERN, "");
}

/** Name of the given variant of an exercise. Idempotent. */
export function withExerciseVariant(name: string, variant: ExerciseVariant): string {
  const base = getBaseExerciseName(name);
  return variant === "unilateral" ? `${base}${UNILATERAL_NAME_SUFFIX}` : base;
}
