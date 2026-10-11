import { parseLocalDate } from "@/lib/analysis/blockDates";

/** Display helpers for the Block view — German number format, rounding only happens here. */

export function formatKg(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function signed(value: number, digits: number): string {
  const rounded = +value.toFixed(digits);
  const text = Math.abs(rounded).toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}${text}`;
}

export function formatSignedKg(value: number): string {
  return `${signed(value, 1)} kg`;
}

export function formatSignedPct(value: number): string {
  return `${signed(value, 1)} %`;
}

/** "82,5 × 8" */
export function formatSet(set: { weight: number; reps: number }): string {
  return `${formatKg(set.weight)} × ${set.reps}`;
}

/** "5.10." */
export function formatDayMonth(dateKey: string): string {
  const d = parseLocalDate(dateKey);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/** "5.10.2026" */
export function formatFullDate(dateKey: string): string {
  const d = parseLocalDate(dateKey);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

/** Tailwind text color for a signed change: gain emerald, loss red, none zinc. */
export function deltaColor(value: number | null): string {
  if (value === null) return "text-zinc-500";
  const rounded = +value.toFixed(1);
  return rounded > 0 ? "text-emerald-400" : rounded < 0 ? "text-red-400" : "text-zinc-500";
}
