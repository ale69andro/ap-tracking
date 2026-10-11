import type {
  BlockEntry,
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
} from "@/app/types";

let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Set with string weight/reps (decimal point), e.g. set("82.5", "5"). Defaults: Normal, completed. */
export function set(weight: string, reps: string, opts: Partial<ExerciseSet> = {}): ExerciseSet {
  return {
    id: nextId("set"),
    weight,
    reps,
    type: "Normal",
    restSeconds: 60,
    completed: true,
    ...opts,
  };
}

export function exercise(name: string, sets: ExerciseSet[]): SessionExercise {
  return {
    id: nextId("ex"),
    exerciseName: name,
    muscleGroups: [],
    sets,
    warmupRestSeconds: 60,
    workingRestSeconds: 120,
  };
}

type SessionOpts = {
  id: string;
  templateId?: string;
  /** Local calendar day "YYYY-MM-DD". */
  date: string;
  /** Local time "HH:MM", default 18:00. */
  time?: string;
  name?: string;
  status?: WorkoutSession["status"];
  /** Overrides the timestamp derived from date/time (e.g. 0 for legacy records). */
  startedAt?: number;
  exercises: SessionExercise[];
};

/** Session whose startedAt is built from LOCAL date and time. */
export function session(opts: SessionOpts): WorkoutSession {
  const [y, m, d] = opts.date.split("-").map(Number);
  const [hh, mm] = (opts.time ?? "18:00").split(":").map(Number);
  const result: WorkoutSession = {
    id: opts.id,
    name: opts.name ?? "Session",
    status: opts.status ?? "completed",
    startedAt: opts.startedAt ?? new Date(y, m - 1, d, hh, mm).getTime(),
    exercises: opts.exercises,
  };
  if (opts.templateId !== undefined) result.templateId = opts.templateId;
  return result;
}

/** Minimal BlockEntry with the given e1RM, for verdict tests. */
export function blockEntry(e1rm: number): BlockEntry {
  return {
    sessionId: nextId("entry"),
    dateKey: "2026-01-05",
    startedAt: 0,
    weekIndex: 1,
    bestSet: { weight: e1rm, reps: 1 },
    e1rm,
    e1rmUnreliable: false,
    deltaVsStartKg: 0,
    deltaVsStartPct: 0,
    deltaVsPrevKg: null,
    deltaVsPrevPct: null,
  };
}
