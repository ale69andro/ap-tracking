# Analysis Engine — Summary

> Read-only audit of `lib/analysis/`, `app/lib/progression.ts` and `app/lib/recommendations.ts`.  
> Purpose: understand what each file does, its inputs/outputs, and where gaps exist.  
> Last verified against the code: 2026-10-11.

---

## Pipeline at a Glance

```
useProgression (app/hooks)
  ├─ computeSessionScore / computeTrend        app/lib/progression.ts
  ├─ analyzeExerciseHistory                    → interpretProgression, computeNextTarget
  ├─ buildTrainingProfile                      UserProfile + DailyCheckIn → TrainingProfile
  └─ getExerciseRecommendation                 → analyzeExerciseHistory, computeNextTarget, getSmartRecommendation

ExerciseProgression[]
  ├─ getWeeklyVolumeByMuscleGroup              ProgressScreen
  ├─ getAdaptiveVolumeInsights → getAdaptiveVolumeRecommendations
  └─ getDashboardCoachSignal                   CoachSnapshotCard

In-session: getExerciseSuggestion (dashboard/page.tsx), detectBadDayDuringWorkout (useWorkout)
```

`useProgression` builds one `ExerciseSession` per workout and exercise (`date, topWeight, topReps, totalVolume, score, setCount`) from completed non-warm-up sets and keeps only the **last 5 sessions** per exercise as `recentSessions`. Everything downstream works on that window.

---

## File-by-File Breakdown

### `calculate1RM.ts`
**Purpose:** Epley formula — estimates 1-rep max from weight + reps.  
**Input:** `weight: number, reps: number`  
**Output:** `number` (0 if invalid)  
**Note:** Reps capped at 15 — formula degrades beyond that range.

---

### `exerciseMetrics.ts`
**Purpose:** Low-level set utilities.  
**Functions:**
- `getTopSet(sets)` → `{ weight, reps } | null` — highest weight; reps as tiebreaker. Used by `useProgression`.
- `calculateEpley1RM(w, r)` → `number` — alias for `calculate1RM`. Used by `analyzeExerciseHistory` and three components (sparklines).
- `getRelevantWorkingSets(sets)` — completed, non-warmup sets with valid weight/reps. **No callers.**
- `calculateSessionVolume(sets)` → `number` — sum of weight × reps. **No callers.**

**Gaps:**
- Two of four exports are dead; the same filtering lives in `app/lib/workout.ts` (`getEffectiveSets`) and the volume sum is inlined in `useProgression`.
- `getExerciseSessionsFromHistory` no longer exists (session extraction moved into `useProgression`), but comments in `getExerciseRecommendation.ts` still refer to it.

---

### `app/lib/progression.ts` (not in `lib/analysis/`)
**Purpose:** Session scoring and the coarse trend shown on `ExerciseProgression.trend`.  
**Exports:**
- `computeSessionScore(sets)` → max e1RM across all valid sets (not the heaviest set)
- `computeTrend(scores)` → `"up" | "flat" | "down" | "none"`

**Logic:** Needs ≥ 3 scores, otherwise `"none"`. Splits the window into an earlier and a recent half and compares their means against `TREND_THRESHOLD`.

**Gaps:**
- `TREND_THRESHOLD` is `0.03`, the comment above it says 2.5%.
- This is a third trend classification next to the two in `analyzeExerciseHistory` (see below).

---

### `analyzeExerciseHistory.ts`
**Purpose:** Main per-exercise analysis. Produces the `ExerciseAnalysisResult` attached to each `ExerciseProgression`.  
**Input:** `sessions: ExerciseSession[]` (chronological), `exerciseName: string`, `repRange?: { min, max }`  
**Output:** `ExerciseAnalysisResult` — trend, reason string, current/previous e1RM, `volumeDeltaPct`, suggested next weight/rep range, confidence, bestWeight, lastTopSet, and the `interpretation` from `interpretProgression`  
**Key logic:**
- Uses last 5 sessions max
- Classifies the **last session vs. the previous one** as `progressing | mixed | stagnating | regressing` from load PR, rep PR at same load, and e1RM delta
- Runs `interpretProgression` on the e1RM series of the whole window
- Calls `computeNextTarget`; when `repRange` is given, passes double-progression options with the equipment increment from `getIncrement` (2.5 kg fallback for exercises not in the built-in library)
- `volumeDeltaPct` = last session volume vs. previous session volume

**Thresholds (e1RM delta, last vs. previous session):**
| Name | Value |
|------|-------|
| E1RM_CLEARLY_UP | ≥ +1.5% |
| E1RM_SLIGHTLY_UP | ≥ +0.5% |
| flat band | −1.0% … +1.0% |
| E1RM_CLEARLY_DOWN | ≤ −1.5% |

**Confidence:** `low` (1 session), `medium` (2), `high` (3+).

**Gaps:**
- `volumeDeltaPct` is computed but nothing reads it.
- Confidence scale differs from `interpretProgression` and `getExerciseRecommendation` (both: 3 = medium, 4+ = high).
- The 4-state `trend` (two-session comparison, ±1.5%) and the 6-state `interpretation` (window trend, 0.8% noise) are both on the output and can disagree. `getExerciseRecommendation` contains a correction for exactly that case.
- Imports from `app/lib/recommendations` and `app/constants/exercises` — the engine is not self-contained in `lib/`.

---

### `interpretProgression.ts`
**Purpose:** Takes a raw chronological e1RM series and returns a structured coaching verdict.  
**Input:** `e1rmSeries: number[]` (oldest → newest)  
**Output:** `ProgressionInterpretation` — `{ status, mappedStatus, confidence, title, subtitle, recommendation }`  
**6 statuses, evaluated in this order:** `fatigue_dip | regressing | progressing | improving_slightly | stalling | stable`  
**Key logic:**
- Computes consecutive deltas, their average (short trend), and coefficient of variation (volatility)
- `fatigue_dip` = latest dropped but the short trend is still above SLIGHT
- `regressing` = latest delta and short trend both below −NOISE
- `stalling` = flat trend + volatility < 3.5% (bouncing ≠ stalling)
- Fewer than 2 values → `stable`, confidence `low`
- Confidence: `low` (n=2), `medium` (n=3), `high` (n≥4)
- Copy varies by confidence level

**Thresholds:**
| Name | Value | Meaning |
|------|-------|---------|
| NOISE | 0.8% | Below this = not meaningful |
| SLIGHT | 2.0% | Small but real |
| CLEAR | 2.5% | Clearly meaningful |

**Gaps:**
- Does not receive a profile — copy is generic, not goal-aware (that's left to `smartCoach.ts`)
- No volume signal — only e1RM

---

### `buildTrainingProfile.ts`
**Purpose:** Derives the `TrainingProfile` the coach works with from the stored `UserProfile` and today's check-in.  
**Input:** `profile: UserProfile`, `dailyCheckIn?: DailyCheckIn | null`  
**Output:** `TrainingProfile` — `recoveryScore`, `recoveryTier`, `loadProgressionStyle`, plus experience, goal, sleep, stress, frequency, intensity style, proximity to failure, equipment access, priority muscle groups  
**Key logic:**
- Defaults for missing profile fields: stress `moderate`, intensity `mixed`, proximity `one_to_two_rir`, equipment `full_gym`, 4 training days
- `recoveryScore` = 75 ± stress (25) ± frequency (10) + beginner bonus (5) + sleep (+10 / −15), clamped 0–100
- `recoveryTier`: static `low` = poor sleep + (high stress or > 5 days); static `high` = good sleep + low stress. Low check-in energy needs a second negative signal to yield `low`; high energy lifts a static `low` to `medium` at most
- `loadProgressionStyle`: beginner `linear`, intermediate `double_progression`, advanced `wave_loading` (or `double_progression` under high stress)

**Gaps:**
- Only `recoveryTier`, `experience`, `goal`, `trainingDaysPerWeek` and `intensityStyle` are read by the engine. `recoveryScore`, `loadProgressionStyle`, `priorityMuscleGroups`, `proximityToFailure` and `equipmentAccess` are derived but never consumed.

---

### `smartCoach.ts`
**Purpose:** Turns an interpretation into a personalized coach message, layered with training profile, volume context, and muscle-group load.  
**Exports:**
- `computeMuscleGroupLoadMap(progressions)` → `Record<string, "low" | "medium" | "high">` — sums `recentSessions.length` per muscle group (≤ 3 low, 4–8 medium, ≥ 9 high)
- `getSmartRecommendation(input)` → `string`

**Input shape (`SmartCoachInput`):**
- `interpretation: ProgressionInterpretation`
- `trainingProfile: TrainingProfile` — uses `experience`, `goal`, `recoveryTier`, `trainingDaysPerWeek`
- `metrics?: { suggestedNextWeight, suggestedRepRange, confidence }`
- `recentSessions?: ExerciseSession[]`
- `muscleGroups?: string[]`
- `muscleGroupContext?: Record<string, "low"|"medium"|"high">`

**Key logic:**
- `status` is the primary switch
- `experience` gates advice complexity (beginners get simple linear advice)
- `recoveryTier === "low"` overrides volume and structure advice for stalling, fatigue dip and regression
- Stalling also branches on `trainingDaysPerWeek` (> 5: recovery is the limiter; ≤ 3: push intensity)
- `recentVolumeLevel` = last session volume vs. average of the window (±15% band)
- Muscle-group load elevates or moderates recommendations

**Gaps:**
- `muscleGroupContext` is optional — when absent, muscle-group logic silently disappears
- Frequency comes from the profile setting, not from actual session dates — no awareness of real rest days between sessions
- No exercise-type differentiation (compound vs. isolation treated identically)
- Beginner stalling copy hardcodes "Add 2.5 kg", independent of the equipment increment
- The load map counts sessions (max 5 per exercise), not sets or volume

---

### `getExerciseRecommendation.ts`
**Purpose:** Central recommendation engine. Combines `analyzeExerciseHistory`, `computeNextTarget` and `getSmartRecommendation` into one structured result per exercise. Called once per exercise in `useProgression`.  
**Input:** `{ exerciseName, sessions, repRange?, trainingProfile?, muscleGroups?, muscleGroupContext? }`  
**Output:** `ExerciseCoachRecommendation` — `targetWeight`, `targetRepsMin/Max`, `targetSets?`, `setAction?`, `action`, `status`, `confidence`, `reason`, `coachMessage?`  
**Key logic:**
- Drops sessions without a valid top set; no history → action `new`, target reps from `repRange` or 8–12
- Confidence: `low` (≤ 2 sessions), `medium` (3), `high` (4+)
- `action`: `fatigue_dip` always holds; `regressing` → `deload` (high confidence and target weight drops) or `reduce_load`; all other statuses follow the direction of `computeNextTarget` (`increase_load`, `increase_reps`, `hold`)
- `reduce_load` correction: if the target did not actually go down, step back one equipment increment
- Intensity tie-breaker: `heavy_low_rep` users get `increase_load` instead of `increase_reps` on stalling/stable/improving_slightly, when recovery is not low, confidence is not low, and the increment is ≤ 5% of the last weight
- Set recommendation: `reduce_set` only on deload with ≥ 3 sets, otherwise `hold_sets`; nothing at low confidence
- `coachMessage` only when a `trainingProfile` is passed

**Gaps:**
- `form_focus` exists as an action type and has copy, but no branch ever returns it
- `add_set` is intentionally not emitted
- `computeNextTarget` runs twice per exercise (inside `analyzeExerciseHistory` and again here)
- Bodyweight exercises have increment 0: the `reduce_load` correction then leaves the weight unchanged, and the intensity tie-breaker can return `increase_load` with the same weight
- Comments still mention `getExerciseSessionsFromHistory` and `sleepQuality`; neither applies any more

---

### `getExerciseTargets.ts`
**Purpose:** Extracts `last`, `best`, and `target` values from an `ExerciseProgression` for display and pre-fill.  
**Input:** `ExerciseProgression`  
**Output:** `{ last, best, target }` — `last`/`best` are `{ weight, reps } | null`, `target` is `{ weight?, repRange? } | null`  
**Also exports:** `parseMiddleRep(repRange)` — parses "8–10" → 9 (used for pre-filling inputs)

**Gaps:**
- `best` = highest e1RM session within the last 5, not the all-time weight PR — can be confusing if the user is curious about their weight PR
- `target` reads the string rep range from `analysis`, not the structured `recommendation`

---

### `getExerciseAlternatives.ts`
**Purpose:** Returns up to 3 exercise alternatives from the built-in LIBRARY based on scoring.  
**Input:** `BuiltInExercise`  
**Output:** `ExerciseAlternative[]` — `{ name, reason }`  
**Scoring:**
- Hard filter: at least one shared `primaryMuscleGroup`
- +3 same `movementType`
- +2 different `equipment`
- +0.5 per overlapping `secondaryMuscleGroup`
- Quality gate: score > 2

**Gaps:**
- No personalization — does not consider what the user has actually done before
- Does not use `equipmentAccess`, although the profile now carries it
- `reason` strings are generic ("Same push pattern, different equipment") — could reference muscle groups

---

### `getWorkoutSuggestion.ts`
**Purpose:** In-session hint: detects when reps drop set-to-set at the same weight and suggests reducing load.  
**Export:** `getExerciseSuggestion(exercise)`  
**Input:** `SessionExercise`  
**Output:** `WorkoutSuggestion | null` — `{ type: "next_set", title, detail }`  
**Logic:** Needs ≥ 2 completed working sets. Triggered only when `prevWeight === lastWeight && lastReps < prevReps`. Suggests `floor(lastWeight × 0.96 / 2.5) × 2.5`; falls back to a generic "reduce load slightly" when that is below 5 kg or not lower than the current weight.

**Gaps:**
- Only detects reps dropping — no "increase load" suggestion when reps are consistently hitting the top of the target range
- Requires `completedAt` timestamps for proper ordering; falls back to array order silently
- Rounds to 2.5 kg regardless of equipment
- No session-to-session awareness — purely intra-session
- Called directly from `dashboard/page.tsx`

---

### `detectBadDayDuringWorkout.ts`
**Purpose:** In-session check whether today's best set is clearly below the recent baseline for that exercise. Called from `useWorkout`.  
**Input:** `{ currentExerciseName, currentSets, recentSessions (newest first), trainingProfile?, recoveryTier? }`  
**Output:** `BadDaySignal` — `{ detected, severity: "none" | "mild" | "moderate" | "severe", reason?, suggestions? }`  
**Logic:** Baseline = average best e1RM of the last up to 3 sessions containing the exercise (needs ≥ 2). Compares today's best e1RM from completed working sets.

**Thresholds (drop vs. baseline):**
| Severity | Normal | Low recovery tier |
|----------|--------|-------------------|
| mild | ≥ 5% | ≥ 4% |
| moderate | ≥ 8% | ≥ 7% |
| severe | ≥ 12% | ≥ 10% |

**Gaps:**
- `trainingProfile` is part of the input type but not read; only `recoveryTier` is
- The baseline skips warm-ups but does not check `completed` on historical sets
- Compares the best set so far — fires on the first working set even if that one was a deliberate lighter set

---

### `getWeeklyVolumeByMuscleGroup.ts`
**Purpose:** Weekly volume (weight × reps) per main muscle group, current week vs. previous week, plus a one-line insight.  
**Exports:** `getWeeklyVolumeByMuscleGroup(progressions)` → `{ groups, insight, hasData }`, `getVolumePreviewText(data)`, `MUSCLE_TO_MAIN`, `toMainGroup(muscleGroups)`  
**Logic:** Maps fine-grained muscles to 5 groups (Chest, Back, Shoulders, Arms, Legs); each exercise counts toward its first matching group only. Weeks run Monday–Sunday. Insight priority: missing group > imbalance > drop > increase > balanced.

**Gaps:**
- Exercises whose muscles are not in `MUSCLE_TO_MAIN` are skipped entirely
- Volume goes to the first listed muscle only — secondary muscles get nothing
- Has its own week-bounds helper instead of using `weekHelpers.ts`

---

### `weekHelpers.ts`
**Purpose:** `getMondayKey(dateStr)` and `getCurrentMondayKey()` — Monday-anchored week keys in local time. Used by the adaptive volume files.

---

### `adaptiveVolume.ts`
**Purpose:** Estimates each muscle group's likely effective weekly volume range from the user's own history and classifies the current week against it.  
**Main export:** `getAdaptiveVolumeInsights(progressions)` → `MuscleAdaptiveVolumeInsight[]`  
**Also exports:** `buildWeeklyMuscleSummaries`, `estimateAdaptiveVolumeRange`, `classifyCurrentVolumeZone`, `computeAdaptiveConfidence`, `getAdaptiveVolumeSummaryString`  
**Key logic:**
- Per (week, muscle): total volume, average e1RM change vs. the exercise's previous week, count of exercises below −0.8%
- "Good week" = has a prior week to compare, delta above the 0.3% signal floor, no fatigue signals
- Range = min/max volume of good weeks (outliers trimmed from 3+ weeks), widened by 5%; needs ≥ 2 good weeks
- Zone: `below | within | above | unknown`; forced to `unknown` on Monday/Tuesday
- Confidence: `low` (< 2 good weeks), `medium` (2), `high` (3+)

**Gaps:**
- Works on `recentSessions`, i.e. at most 5 sessions per exercise — the number of comparable weeks is small by construction
- Range is in kg volume, not sets

---

### `adaptiveVolumeRecommendations.ts`
**Purpose:** Translates volume insights into weekly-set recommendations and applies guardrails.  
**Exports:** `buildWeeklyMuscleSetSummaries`, `getSetAdjustmentForInsight`, `getMuscleSetThresholds`, `applyAdaptiveVolumeGuardrails`, `getAdaptiveVolumeRecommendation`, `getAdaptiveVolumeRecommendations(insights, weeklySetSummaries)`  
**Key logic:**
- Current weekly sets per muscle from `ExerciseSession.setCount`
- Small adjustments only (2–4 sets); no prescription at low confidence

**Guardrails (current weekly sets, large = Chest/Back/Legs):**
| Guardrail | Large | Small |
|-----------|-------|-------|
| Block "add sets" at or above | 16 | 12 |
| Block "reduce sets" at or below | 6 | 4 |
| Soften language at or below | 2 | 1 |

**Gaps:**
- Called from `ProgressScreen.tsx` directly, not via a hook
- Not connected to the per-exercise set recommendation in `getExerciseRecommendation`

---

### `getDashboardCoachSignal.ts`
**Purpose:** One dashboard-level verdict `{ title, subtitle, state: "good" | "neutral" | "warning" }` from all progressions. Used by `CoachSnapshotCard`.  
**Priority:** regressing exercise → fatigue dip → 2+ stalling → 1 stalling (high confidence) → volume above range → volume below range (high confidence) → 2+ progressing (high confidence) → 1 progressing → stable fallback  
**Logic:** Ignores exercises with low-confidence interpretations. Volume step is wrapped in `try/catch` and skipped on error.

**Gaps:**
- Reports only the first match — one regressing exercise hides everything else
- Volume subtitles say "weekly sets", the underlying zone is computed from kg volume

---

### `app/lib/recommendations.ts` (not in `lib/analysis/`)
**Purpose:** Produces a concrete `NextTarget` (weight + rep range) for the next session.  
**Exports:**
- `getIncrement(equipment)` → kg
- `countFlatSessions(sessions)` → `number` — trailing sessions at same weight+reps
- `computeNextTarget(sessions, trend, options?)` → `NextTarget | null`

**Increments:** Barbell, EZ Bar, Smith, Cable, Machine 2.5 kg · Dumbbell 2.0 kg · Kettlebell 4.0 kg · Bodyweight 0

**Double progression (when `options` with a valid rep range is passed — takes priority):**
| Last top set | Action |
|--------------|--------|
| reps < range max | same weight, +1 rep |
| reps ≥ range max | +increment, reps reset to `max(range min, reps − 4)` |

**Trend-based fallback (no rep range):**
| Trend | Action |
|-------|--------|
| up | +2.5 kg, reps `r−2 … r` |
| flat < 3 sessions | same weight, reps `r … r+2` |
| flat ≥ 3 sessions | +2.5 kg, reps `r−1 … r` |
| down | −2.5 kg (min 2.5), same reps |
| mixed | same weight, reps `r … r+2` |
| none | echo last session |

**Gaps:**
- The fallback path always uses 2.5 kg, regardless of equipment. It applies to exercises without a rep range, i.e. those not in any template
- No awareness of user goal — same step for strength vs. hypertrophy
- An increment of 0 (Bodyweight) falls back to 2.5 kg in the double-progression branch
- `countFlatSessions` counts only identical weight+reps — e1RM-flat sessions at slightly different combos are invisible to it

---

## Data Available but Not Used

| Data | Where it lives | Status |
|------|---------------|--------|
| `volumeDeltaPct` | `ExerciseAnalysisResult` | Computed, never read |
| `recoveryScore`, `loadProgressionStyle`, `priorityMuscleGroups`, `proximityToFailure`, `equipmentAccess` | `TrainingProfile` | Derived, never read by the engine |
| Set-level `completedAt` timestamps | `ExerciseSet.completedAt` | Only used for ordering in `getExerciseSuggestion` — no rest-time or set-duration analysis |
| RPE / RIR per set | — | Not tracked |
| Session dates | `ExerciseSession.date` | Used for weekly bucketing only — not for rest days or real training frequency |
| Historical warm-up sets | Filtered out explicitly | Never analyzed for readiness/fatigue signals |
| Training day context | `WorkoutSession.trainingDayIndex`, `templateId` | Not passed into analysis — "Push A" and "Push B" sessions of the same exercise are compared as equals |
| History beyond 5 sessions | `workout_sessions` | Cut off in `useProgression` before any analysis |

---

## Key Weaknesses

1. **Three trend classifications for the same data** — `computeTrend` (half-average, 3%), the 4-state trend in `analyzeExerciseHistory` (last two sessions, 1.5%) and the 6-state `interpretProgression` (window, 0.8% noise). They use different thresholds and three different confidence scales; `getExerciseRecommendation` already needs a correction step to reconcile two of them.

2. **Everything runs on a 5-session window** — fine for per-exercise trends, thin for the adaptive volume engine, which needs several comparable weeks per muscle group.

3. **Profile data is collected but mostly unused** — equipment access, priority muscles, proximity to failure and load progression style are stored and derived, but change no recommendation.

4. **Equipment increments are only half applied** — the double-progression path uses them; the trend fallback, the in-session suggestion and the beginner copy in `smartCoach` are fixed at 2.5 kg. Bodyweight (increment 0) is not handled consistently.

5. **No in-session "load increase" trigger** — `getExerciseSuggestion` only suggests reducing load. There is no counterpart that says "you've hit the top of your rep range — go heavier next set."

6. **Two volume systems that don't talk to each other** — per-exercise set advice (`getExerciseRecommendation`) and per-muscle weekly set advice (`adaptiveVolumeRecommendations`) are computed independently.

7. **Dead and stale code** — `getRelevantWorkingSets`, `calculateSessionVolume`, the unreachable `form_focus` action, the unused `trainingProfile` input of `detectBadDayDuringWorkout`, and comments referring to removed functions.

8. **No tests** — none of the thresholds above are covered; there is no test framework in the project.
