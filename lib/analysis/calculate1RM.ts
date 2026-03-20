/** Epley formula. Capped at 15 reps — formula degrades beyond that range. */
export function calculate1RM(weight: number, reps: number): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  const r = Math.min(reps, 15);
  return weight * (1 + r / 30);
}