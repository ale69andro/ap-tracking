import type { WorkoutSession } from "@/app/types";

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/** Format a session's display date. Uses startedAt when available, falls back to legacy date string. */
export function getSessionDate(session: WorkoutSession): string {
  if (session.startedAt > 0) {
    return new Date(session.startedAt).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }
  return session.date ?? "Unknown date";
}
