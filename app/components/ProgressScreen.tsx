"use client";

import { useState } from "react";
import type { ExerciseProgression, ExerciseSession, UserProfile, TrainingDay, WorkoutTemplate } from "@/app/types";
import { computeNextTarget } from "@/app/lib/recommendations";
import { calculateEpley1RM } from "@/lib/analysis/exerciseMetrics";
import { getSmartRecommendation, computeMuscleGroupLoadMap } from "@/lib/analysis/smartCoach";
import SparkLine from "./SparkLine";
import { CoachLabel } from "./CoachLabel";
import { getWeeklyVolumeByMuscleGroup } from "@/lib/analysis/getWeeklyVolumeByMuscleGroup";
import { getAdaptiveVolumeInsights } from "@/lib/analysis/adaptiveVolume";
import { getAdaptiveVolumeRecommendations, buildWeeklyMuscleSetSummaries } from "@/lib/analysis/adaptiveVolumeRecommendations";
import WeeklyCoachingCard from "./WeeklyCoachingCard";
import VolumePreviewCard from "./VolumePreviewCard";
import VolumeDetailSheet from "./VolumeDetailSheet";
import { getExerciseRole } from "@/app/constants/exercises";

// ─── Resolved exercise card state ─────────────────────────────────────────────

/**
 * Single UI-facing status for an exercise card.
 * Derived from interpretation.status (primary) or analysis.trend (fallback).
 * All card elements — badge, headline, subtitle, coach text — derive from this.
 */
type ResolvedExerciseStatus = "progressing" | "stable" | "plateau" | "declining" | "support" | "new";

type ResolvedExerciseCardState = {
  status:     ResolvedExerciseStatus;
  badgeLabel: string;
  color:      string;
  bg:         string;
  spark:      string;
  glow:       string;
  headline:   string;
  subtitle:   string | null;
  coachText:  string;
};

const STATUS_BADGE: Record<ResolvedExerciseStatus, { label: string; color: string; bg: string; spark: string; glow: string }> = {
  progressing: { label: "Progressing", color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30", spark: "#10b981", glow: "#10b98126"   },
  stable:      { label: "Stable",      color: "text-zinc-400",    bg: "bg-zinc-800/50   border-zinc-700/30",     spark: "#71717a", glow: "transparent"  },
  plateau:     { label: "Plateau",     color: "text-amber-400",   bg: "bg-amber-500/15  border-amber-500/30",    spark: "#f59e0b", glow: "#f59e0b26"    },
  declining:   { label: "Declining",   color: "text-red-400",     bg: "bg-red-500/15    border-red-500/30",      spark: "#f87171", glow: "#f8717126"    },
  support:     { label: "Support",     color: "text-zinc-400",    bg: "bg-zinc-800/50   border-zinc-700/30",     spark: "#71717a", glow: "transparent"  },
  new:         { label: "New",         color: "text-zinc-400",    bg: "bg-zinc-800/50   border-zinc-700/30",     spark: "#52525b", glow: "transparent"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Delta = { wDiff: number; rDiff: number; positive: boolean; neutral: boolean };

function getDelta(sessions: ExerciseSession[]): Delta | null {
  if (sessions.length < 2) return null;
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const wDiff = +(last.topWeight - prev.topWeight).toFixed(2);
  const rDiff = last.topReps - prev.topReps;
  return {
    wDiff,
    rDiff,
    positive: wDiff > 0 || (wDiff === 0 && rDiff > 0),
    neutral:  wDiff === 0 && rDiff === 0,
  };
}

// ─── Resolved state engine ────────────────────────────────────────────────────

/**
 * Maps interpretation.status (the refined 6-state engine) to a 5-state UI status.
 * Falls back to analysis.trend when no interpretation is present.
 * Support role is handled upstream in resolveExerciseCardState.
 */
function getResolvedStatus(p: ExerciseProgression): ResolvedExerciseStatus {
  if (p.recentSessions.length < 2) return "new";

  const interp = p.analysis?.interpretation;
  if (interp) {
    switch (interp.status) {
      case "progressing":
      case "improving_slightly": return "progressing";
      case "stalling":           return "plateau";
      case "fatigue_dip":
      case "stable":             return "stable";
      case "regressing":         return "declining";
    }
  }

  // Fallback: analysis.trend (when interpretation layer is absent)
  const trend = p.analysis?.trend;
  if (trend === "progressing")           return "progressing";
  if (trend === "regressing")            return "declining";
  if (trend === "stagnating")            return "plateau";
  // "mixed" and "flat" fall to stable — no clear directional signal
  return "stable";
}

function statusToDefaultHeadline(status: ResolvedExerciseStatus): string {
  switch (status) {
    case "progressing": return "Strength trending up";
    case "stable":      return "Strength holding steady";
    case "plateau":     return "No meaningful progress";
    case "declining":   return "Performance declining";
    default:            return "Strength holding steady";
  }
}

/**
 * Derives coach action text from the resolved status — not independently from
 * a separate signal. Preserves concrete load targets (highest signal) and
 * smart-coach personalisation where available.
 */
function buildCoachText(
  p: ExerciseProgression,
  status: ResolvedExerciseStatus,
  profile?: UserProfile,
  mgContext?: Record<string, "low" | "medium" | "high">,
): string {
  const interp = p.analysis?.interpretation;
  const w      = p.analysis?.suggestedNextWeight;
  const reps   = p.analysis?.suggestedRepRange;
  const conf   = p.analysis?.confidence;

  const smartCoach = (): string => {
    if (interp && profile) {
      return getSmartRecommendation({
        interpretation:    interp,
        profile,
        metrics:           { suggestedNextWeight: w ?? null, suggestedRepRange: reps ?? null, confidence: conf ?? null },
        recentSessions:    p.recentSessions,
        muscleGroups:      p.muscleGroups,
        muscleGroupContext: mgContext,
      });
    }
    return interp?.recommendation ?? "Keep logging to unlock insights";
  };

  switch (status) {
    case "progressing":
      // Concrete target wins; smart coach as fallback
      if (w != null && reps != null) return `Keep going — next: ${w} kg × ${reps} reps`;
      return smartCoach();

    case "plateau":
      if (w != null && reps != null) {
        return conf === "high"
          ? `Plateau detected — push to ${w} kg × ${reps} reps`
          : `Try ${w} kg × ${reps} reps to break the plateau`;
      }
      return smartCoach();

    case "declining":
      if (w != null && reps != null) {
        return conf === "high"
          ? `Deload to ${w} kg × ${reps} reps — stop the decline`
          : `Step back to ${w} kg × ${reps} reps`;
      }
      return smartCoach();

    case "stable": {
      // fatigue_dip: hold — never push load
      if (interp?.status === "fatigue_dip") {
        return "Hold current load and focus on quality reps — output will recover";
      }
      // Smart coach or concrete next-target as fallback
      if (interp && profile) return smartCoach();
      const target = computeNextTarget(p.recentSessions, "flat");
      if (target) {
        const repsStr = target.repsMin === target.repsMax
          ? `${target.repsMin}`
          : `${target.repsMin}–${target.repsMax}`;
        return `Next → ${target.weight} kg × ${repsStr} reps`;
      }
      return interp?.recommendation ?? "Solid base — push for an extra rep or small weight jump when ready";
    }

    default:
      return "Keep logging to unlock insights";
  }
}

/**
 * Single source of truth for all exercise card display state.
 * Badge, headline, subtitle, and coach text all come from here — no independent derivation.
 */
function resolveExerciseCardState(
  p: ExerciseProgression,
  profile?: UserProfile,
  mgContext?: Record<string, "low" | "medium" | "high">,
): ResolvedExerciseCardState {
  // 1. Support role — neutral framing, no performance judgment
  if (getExerciseRole(p.name) === "support") {
    const b = STATUS_BADGE.support;
    return {
      status: "support", ...b, badgeLabel: b.label,
      headline:  "Support movement — keep it consistent",
      subtitle:  null,
      coachText: "Keep the load steady and prioritize control.",
    };
  }

  // 2. No prior sessions — nothing to derive yet
  if (p.recentSessions.length < 2) {
    const b = STATUS_BADGE.new;
    return {
      status: "new", ...b, badgeLabel: b.label,
      headline:  "First session recorded",
      subtitle:  "Log one more session to start tracking progress",
      coachText: "Log one more session to start tracking progress",
    };
  }

  // 3. Resolve status from interpretation (primary) or trend fallback
  const status  = getResolvedStatus(p);
  const b       = STATUS_BADGE[status];
  const interp  = p.analysis?.interpretation;

  const headline  = interp?.title    ?? statusToDefaultHeadline(status);
  const subtitle  = interp?.subtitle ?? null;
  const coachText = buildCoachText(p, status, profile, mgContext);

  return { status, ...b, badgeLabel: b.label, headline, subtitle, coachText };
}

// ─── Delta Metrics chips (weight + reps, each colored by own sign) ───────────

function deltaColor(n: number): string {
  return n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-zinc-500";
}

function DeltaMetrics({ delta }: { delta: Delta | null }) {
  if (!delta) {
    return <p className="text-[11px] text-zinc-600 mb-3">First session — log one more to compare</p>;
  }
  if (delta.neutral) {
    return <p className="text-[11px] text-zinc-500 mb-3">Same top set as last session</p>;
  }
  return (
    <div className="flex items-center gap-2.5 mb-3 text-[11px] text-zinc-600">
      {delta.wDiff !== 0 && (
        <span className="flex items-center gap-1">
          <span>Weight</span>
          <span className={`font-medium tabular-nums ${deltaColor(delta.wDiff)}`}>
            {delta.wDiff > 0 ? "+" : ""}{delta.wDiff} kg
          </span>
        </span>
      )}
      {delta.wDiff !== 0 && delta.rDiff !== 0 && (
        <span className="text-zinc-800">·</span>
      )}
      {delta.rDiff !== 0 && (
        <span className="flex items-center gap-1">
          <span>Reps</span>
          <span className={`font-medium tabular-nums ${deltaColor(delta.rDiff)}`}>
            {delta.rDiff > 0 ? "+" : ""}{delta.rDiff}
          </span>
        </span>
      )}
      <span className="text-zinc-800">vs last</span>
    </div>
  );
}


function computeOverview(progressions: ExerciseProgression[]) {
  const withPrev = progressions.filter((p) => p.recentSessions.length >= 2);

  const improvingCount = withPrev.filter((p) => getResolvedStatus(p) === "progressing").length;

  const wDeltas = withPrev
    .map((p) => getDelta(p.recentSessions))
    .filter((d): d is Delta => d !== null)
    .map((d) => d.wDiff)
    .filter((d) => d !== 0);
  const avgStrength =
    wDeltas.length > 0 ? +(wDeltas.reduce((s, d) => s + d, 0) / wDeltas.length).toFixed(1) : 0;

  const lastVol = withPrev.reduce(
    (s, p) => s + p.recentSessions[p.recentSessions.length - 1].totalVolume, 0
  );
  const prevVol = withPrev.reduce(
    (s, p) => s + p.recentSessions[p.recentSessions.length - 2].totalVolume, 0
  );
  const volPct = prevVol > 0 ? Math.round(((lastVol - prevVol) / prevVol) * 100) : 0;

  return { improvingCount, total: progressions.length, avgStrength, volPct };
}

// ─── Overview Tile ────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 bg-zinc-900/40 border border-zinc-800/30 rounded-2xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{label}</p>
      <p className={`text-xl font-black leading-none ${valueColor ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Focus Priority ───────────────────────────────────────────────────────────

function getFocusScore(p: ExerciseProgression): number {
  // Single session: insufficient data for meaningful classification — lowest priority
  if (p.recentSessions.length < 2) return 0;
  const status = getResolvedStatus(p);
  const conf   = p.analysis?.confidence;
  let score = 0;
  if (status === "declining")   score += 300;
  else if (status === "plateau") score += 200;
  else if (status === "stable")  score += 150;
  else if (status === "progressing") score += 100;
  if (conf === "high")   score += 30;
  else if (conf === "medium") score += 20;
  else if (conf === "low")    score += 10;
  return score;
}

// ─── Next Action Block ────────────────────────────────────────────────────────

function CoachBlock({ text, accentColor }: { text: string; accentColor: string }) {
  return (
    <div
      className="mt-3 bg-zinc-800/60 rounded-xl px-3.5 py-2.5"
      style={{ borderLeft: `2px solid ${accentColor}60` }}
    >
      <CoachLabel />
      <p className="text-[13px] font-semibold text-white leading-snug">{text}</p>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</p>
      <span className="text-[10px] text-zinc-700 font-bold">{count}</span>
      <div className="flex-1 h-px bg-zinc-800/60" />
    </div>
  );
}

// ─── Focus Today Card ─────────────────────────────────────────────────────────

function FocusTodayCard({ p, onTap, profile, mgContext }: { p: ExerciseProgression; onTap: () => void; profile?: UserProfile; mgContext?: Record<string, "low" | "medium" | "high"> }) {
  const state = resolveExerciseCardState(p, profile, mgContext);

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900/60 border rounded-[18px] px-5 py-4 mb-8 hover:bg-zinc-800/60 active:scale-[0.98] transition-all duration-150"
      style={{ borderColor: `${state.spark}50` }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Focus Today</p>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[15px] font-black text-white leading-snug truncate">{p.name}</p>
        <span
          className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${state.bg} ${state.color}`}
          style={{ boxShadow: `0 0 10px ${state.glow}` }}
        >
          {state.badgeLabel}
        </span>
      </div>
      <p
        className={`text-[18px] font-black leading-snug mb-1 ${state.color}`}
        style={{ textShadow: `0 0 28px ${state.spark}4D` }}
      >
        {state.headline}
      </p>
      {state.subtitle && (
        <p className="text-[12px] text-zinc-500 font-medium mb-3 leading-snug">
          {state.subtitle}
        </p>
      )}
      <CoachBlock text={state.coachText} accentColor={state.spark} />
    </button>
  );
}

// ─── Exercise Progress Card ───────────────────────────────────────────────────

function ExerciseCard({
  p,
  onTap,
  profile,
  mgContext,
}: {
  p: ExerciseProgression;
  onTap: () => void;
  profile?: UserProfile;
  mgContext?: Record<string, "low" | "medium" | "high">;
}) {
  const state        = resolveExerciseCardState(p, profile, mgContext);
  const delta        = getDelta(p.recentSessions);
  const sessionCount = p.recentSessions.length;
  const isEarlyData  = sessionCount < 4;

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-zinc-900/40 border border-zinc-800/30 rounded-[18px] px-5 py-4 hover:bg-zinc-800/40 hover:border-zinc-700/30 active:scale-[0.98] transition-all duration-150"
    >
      {/* Row 1: name + badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[15px] font-black text-white leading-snug truncate">{p.name}</p>
          {p.muscleGroups.length > 0 && (
            <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{p.muscleGroups.join(" · ")}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${state.bg} ${state.color}`}
          style={{ boxShadow: `0 0 10px ${state.glow}` }}
        >
          {state.badgeLabel}
        </span>
      </div>

      {/* Row 2: headline + subtitle + delta chips */}
      <p
        className={`text-[18px] font-black leading-snug mb-1 ${state.color}`}
        style={{ textShadow: `0 0 28px ${state.spark}4D` }}
      >
        {state.headline}
      </p>
      {state.subtitle && (
        <p className="text-[12px] text-zinc-500 font-medium mb-2 leading-snug">
          {state.subtitle}
        </p>
      )}
      {state.status !== "support" && (
        <div style={{ opacity: 0.88 }}>
          <DeltaMetrics delta={delta} />
        </div>
      )}

      {/* Row 3: sparkline — adapts to available data */}
      {sessionCount >= 2 && state.status !== "support" && (
        <div className={`mb-3${isEarlyData ? " opacity-70" : ""}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 mb-1">
            {sessionCount >= 4 ? "E1RM · recent signal" : `E1RM · ${sessionCount}-session view`}
          </p>
          <SparkLine
            data={p.recentSessions.slice(-Math.min(sessionCount, 4)).map((s) => calculateEpley1RM(s.topWeight, s.topReps))}
            height={sessionCount === 2 ? 34 : 52}
            color={state.spark}
            minRangePct={sessionCount >= 3 ? 0.06 : 0}
          />
          {isEarlyData && (
            <p className="text-[9px] text-zinc-600 mt-1.5">
              Early trend — {4 - sessionCount} more session{4 - sessionCount !== 1 ? "s" : ""} improve{4 - sessionCount !== 1 ? "" : "s"} accuracy
            </p>
          )}
        </div>
      )}

      {/* Row 4: coach action */}
      <CoachBlock text={state.coachText} accentColor={state.spark} />

      {/* Row 5: low-confidence notice */}
      {p.analysis?.confidence === "low" && state.status !== "support" && (
        <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed">
          Based on {p.recentSessions.length} session{p.recentSessions.length === 1 ? "" : "s"} — more data improves accuracy
        </p>
      )}
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  progressions: ExerciseProgression[];
  onTapExercise: (p: ExerciseProgression) => void;
  profile?: UserProfile;
  nextDay?: TrainingDay | null;
  templates?: WorkoutTemplate[];
};

/** Returns the set of exercise names scheduled for today, or null if unavailable. */
function getTodayExerciseNames(
  nextDay: TrainingDay | null | undefined,
  templates: WorkoutTemplate[] | undefined,
): Set<string> | null {
  if (!nextDay?.templateId || !templates) return null;
  const template = templates.find((t) => t.id === nextDay.templateId);
  if (!template) return null;
  return new Set(template.exercises.map((e) => e.name));
}

const SECTION_CONFIG = [
  { key: "up",      label: "Progressing",     color: "text-emerald-500" },
  { key: "down",    label: "Needs Attention", color: "text-red-500"     },
  { key: "mixed",   label: "Mixed Signal",    color: "text-amber-500"   },
  { key: "flat",    label: "Plateau",         color: "text-zinc-500"    },
  { key: "none",    label: "New",             color: "text-zinc-500"    },
  { key: "support", label: "Support & Prep",  color: "text-zinc-600"    },
] as const;

function statusToSectionKey(status: ResolvedExerciseStatus): string {
  switch (status) {
    case "progressing": return "up";
    case "declining":   return "down";
    case "plateau":     return "flat";
    case "stable":      return "flat";
    case "support":     return "support";
    case "new":         return "none";
  }
}

function groupProgressions(progressions: ExerciseProgression[]) {
  const map = new Map<string, ExerciseProgression[]>(
    SECTION_CONFIG.map(s => [s.key, []])
  );
  for (const p of progressions) {
    if (getExerciseRole(p.name) === "support") {
      map.get("support")!.push(p);
      continue;
    }
    const key = statusToSectionKey(getResolvedStatus(p));
    map.get(key)!.push(p);
  }
  return SECTION_CONFIG
    .map(s => ({
      ...s,
      items: map.get(s.key)!.sort((a, b) => getFocusScore(b) - getFocusScore(a)),
    }))
    .filter(s => s.items.length > 0);
}

export default function ProgressScreen({ progressions, onTapExercise, profile, nextDay, templates }: Props) {
  const [volumeSheetOpen, setVolumeSheetOpen] = useState(false);
  const overview     = computeOverview(progressions);
  const groups       = groupProgressions(progressions);
  const mgContext    = computeMuscleGroupLoadMap(progressions);
  const weeklyVolume           = getWeeklyVolumeByMuscleGroup(progressions);
  const adaptiveInsights       = getAdaptiveVolumeInsights(progressions);
  const weeklySetSummaries     = buildWeeklyMuscleSetSummaries(progressions);
  const adaptiveRecommendations = getAdaptiveVolumeRecommendations(adaptiveInsights, weeklySetSummaries);

  // Focus pool: exercises scheduled for today when plan context is available,
  // otherwise fall back to all exercises.
  // Support exercises are always excluded — they are prep/rehab movements, not performance targets.
  const todayNames  = getTodayExerciseNames(nextDay, templates);
  const focusPool   = (todayNames
    ? progressions.filter((p) => todayNames.has(p.name))
    : progressions
  ).filter((p) => getExerciseRole(p.name) !== "support");
  const focus = focusPool.length >= 1
    ? [...focusPool].sort((a, b) => getFocusScore(b) - getFocusScore(a))[0]
    : null;

  const noData = progressions.length === 0;

  return (
    <>
      {/* Header */}
      <header className="mb-8">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          AP-Tracking
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight leading-none">Progress</h1>
      </header>

      {noData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-zinc-400 text-base font-bold mb-1">No data yet</p>
          <p className="text-zinc-600 text-sm">Complete workouts to track your progress.</p>
        </div>
      ) : (
        <>
          {/* Weekly Coaching */}
          <WeeklyCoachingCard recommendations={adaptiveRecommendations} />

          {/* Focus Today */}
          {focus && (
            <FocusTodayCard p={focus} onTap={() => onTapExercise(focus)} profile={profile} mgContext={mgContext} />
          )}

          {/* Volume preview — tap to open detail sheet */}
          <VolumePreviewCard data={weeklyVolume} onOpen={() => setVolumeSheetOpen(true)} />

          {/* Overview */}
          <div className="flex gap-3 mb-8">
            <Tile
              label="Improving"
              value={`${overview.improvingCount}/${overview.total}`}
              sub="exercises"
              valueColor={
                overview.improvingCount > overview.total / 2 ? "text-emerald-400" : "text-amber-400"
              }
            />
            <Tile
              label="Strength"
              value={overview.avgStrength !== 0 ? `${overview.avgStrength > 0 ? "+" : ""}${overview.avgStrength} kg` : "—"}
              sub="avg vs last"
              valueColor={
                overview.avgStrength > 0
                  ? "text-emerald-400"
                  : overview.avgStrength < 0
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            />
            <Tile
              label="Volume"
              value={overview.volPct !== 0 ? `${overview.volPct > 0 ? "+" : ""}${overview.volPct}%` : "—"}
              sub="vs last session"
              valueColor={
                overview.volPct > 0
                  ? "text-emerald-400"
                  : overview.volPct < 0
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            />
          </div>

          {/* Exercise cards grouped by trend */}
          <div>
            {groups.map((group) => (
              <div key={group.key}>
                <SectionHeader label={group.label} color={group.color} count={group.items.length} />
                <div className="space-y-4">
                  {group.items.map((p) => (
                    <ExerciseCard key={p.name} p={p} onTap={() => onTapExercise(p)} profile={profile} mgContext={mgContext} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Volume detail sheet */}
          {volumeSheetOpen && (
            <VolumeDetailSheet data={weeklyVolume} onClose={() => setVolumeSheetOpen(false)} />
          )}
        </>
      )}
    </>
  );
}
