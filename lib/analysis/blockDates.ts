/**
 * Local-calendar date helpers for training blocks.
 * All keys are "YYYY-MM-DD" in the device's local timezone — never derive them
 * from toISOString(), which shifts late-evening sessions onto the next UTC day.
 */

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" as local midnight. */
export function parseLocalDate(dateKey: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

/** Local calendar day of a timestamp (ms). */
export function toLocalDateKey(timestamp: number): string {
  return formatLocalDate(new Date(timestamp));
}

/** Adds calendar days via the Date constructor so DST changes never shift the day. */
export function addDays(dateKey: string, days: number): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return formatLocalDate(new Date(y, mo - 1, d + days));
}

/**
 * Block window as date keys: start inclusive, end exclusive.
 * A block that was ended early stops after its endedAt day.
 */
export function getBlockWindow(
  startDate: string,
  lengthWeeks: number,
  endedAt?: string,
): { start: string; endExclusive: string } {
  const plannedEnd = addDays(startDate, lengthWeeks * 7);
  if (!endedAt) return { start: startDate, endExclusive: plannedEnd };
  const actualEnd = addDays(endedAt, 1);
  return { start: startDate, endExclusive: actualEnd < plannedEnd ? actualEnd : plannedEnd };
}

/** 1-based week of a day within a block: days 0–6 → week 1, day 7 → week 2. */
export function weekIndexOf(dateKey: string, startDate: string): number {
  const diffMs = parseLocalDate(dateKey).getTime() - parseLocalDate(startDate).getTime();
  // Local midnights differ by 23h/25h across DST changes — round to whole days.
  const days = Math.round(diffMs / 86_400_000);
  return Math.floor(days / 7) + 1;
}

/**
 * Where "today" sits in a block: current week clamped to 1..lengthWeeks,
 * plus whether the block has not started yet or its planned end has passed.
 */
export function getBlockTimeline(
  startDate: string,
  lengthWeeks: number,
  today: string,
): { currentWeek: number; notStarted: boolean; expired: boolean } {
  const week = weekIndexOf(today, startDate);
  return {
    currentWeek: Math.min(Math.max(week, 1), lengthWeeks),
    notStarted: today < startDate,
    expired: today >= addDays(startDate, lengthWeeks * 7),
  };
}
