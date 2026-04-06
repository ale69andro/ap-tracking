# Analysis Engine — Summary

> Read-only audit of `lib/analysis/` + `app/lib/recommendations.ts`.  
> Purpose: understand what each file does, its inputs/outputs, and where gaps exist.

---

## File-by-File Breakdown

### `calculate1RM.ts`
**Purpose:** Epley formula — estimates 1-rep max from weight + reps.  
**Input:** `weight: number, reps: number`  
**Output:** `number` (0 if invalid)  
**Note:** Reps capped at 15 — formula degrades beyond that range.

---

### `exerciseMetrics.ts`
**Purpose:** Low-level data extraction utilities. The central source of "clean set" and "top set" logic.  
**Functions:**
- `getRelevantWorkingSets(sets)` — filters to completed, non-warmup sets with valid weight/reps
- `getTopSet(sets)` → `{ weight, reps } | null` — highest weight; reps as tiebreaker
- `calculateSessionVolume(sets)` → `number` — sum of weight × reps
- `calculateEpley1RM(w, r)` → `number` — thin wrapper over `calculate1RM`
- `getExerciseSessionsFromHistory(workouts, exerciseName)` → `ExerciseSession[]` — extracts chronological per-exercise sessions from full workout history (oldest → newest)

**Note:** Imports `getSessionDate` from `useWorkout` hook — breaks the "no UI imports in analysis" rule from CLAUDE.md.

---

### `analyzeExercise.ts`
**Purpose:** Simple 3-session trend check. Returns 4 statuses + a generic suggestion string.  
**Input:** `AnalysisSession[]` (local type: date, bestWeight, bestReps, bestEstimated1RM)  
**Output:** `{ status: "progression" | "stagnation" | "regression" | "not-enough-data", suggestion: string }`  
**Gaps:**
- Uses its own local `AnalysisSession` type, not the canonical `ExerciseSession` from `app/types.ts`
- Logic is purely "last > previous" — no thresholds, no volatility, no confidence
- Superseded by `analyzeExerciseHistory.ts` but never removed — dead code risk

---

### `analyzeExerciseHistory.ts`
**Purpose:** Main analysis function. Produces the full `ExerciseAnalysisResult` used by the progression screen.  
**Input:** `sessions: ExerciseSession[]` (chronological), `exerciseName: string`  
**Output:** `ExerciseAnalysisResult` — includes trend, reason string, e1RM values, suggested next weight/reps, confidence, bestWeight, lastTopSet, and the `interpretation` from `interpretProgression`  
**Key logic:**
- Uses last 5 sessions max
- Classifies trend as `progressing | mixed | stagnating | regressing` using load/rep PRs + e1RM delta thresholds
- Runs `interpretProgression` on the e1RM series internally
- Calls `computeNextTarget` (from `recommendations.ts`) for weight/rep suggestions

**Gaps:**
- `volumeDeltaPct` is hardcoded to `null` (comment explains why: no workout context to compare fairly)
- `totalVolume` in `ExerciseSession` is never used here — only the top set matters for this path
- Two trend systems coexist: the local 4-state `trend` + the 6-state `ProgressionInterpretation` — both attached to the output but not always reconciled

---

### `interpretProgression.ts`
**Purpose:** Takes a raw chronological e1RM series and returns a structured coaching verdict.  
**Input:** `e1rmSeries: number[]` (oldest → newest)  
**Output:** `ProgressionInterpretation` — `{ status, mappedStatus, confidence, title, subtitle, recommendation }`  
**6 statuses:** `progressing | improving_slightly | stable | stalling | fatigue_dip | regressing`  
**Key logic:**
- Computes consecutive deltas, short-trend average, and coefficient-of-variation (volatility)
- `fatigue_dip` = latest dropped but overall trend was still up
- `stalling` = flat trend + low volatility (bouncing ≠ stalling)
- Confidence: `low` (n=2), `medium` (n=3), `high` (n≥4)
- Copy varies by confidence level

**Thresholds:**
| Name | Value | Meaning |
|------|-------|---------|
| NOISE | 0.8% | Below this = not meaningful |
| SLIGHT | 2.0% | Small but real |
| CLEAR | 2.5% | Clearly meaningful |

**Gaps:**
- Does not receive `UserProfile` — copy is generic, not goal-aware (that's left to `smartCoach.ts`)
- No volume signal — only e1RM

---

### `smartCoach.ts`
**Purpose:** Translates `interpretProgression` output into a personalized recommendation string, layered with user profile, volume context, and muscle-group load.  
**Exports:**
- `computeMuscleGroupLoadMap(progressions)` → `Record<string, "low" | "medium" | "high">` — session-count proxy for muscle group load
- `getSmartRecommendation(input)` → `string`

**Input shape (`SmartCoachInput`):**
- `interpretation: ProgressionInterpretation`
- `profile: UserProfile` — uses `experience`, `goal`, `sleepQuality`
- `metrics?: { suggestedNextWeight, suggestedRepRange, confidence }`
- `recentSessions?: ExerciseSession[]`
- `muscleGroups?: string[]`
- `muscleGroupContext?: Record<string, "low"|"medium"|"high">`

**Key logic:**
- `status` is the primary switch
- `experience` (beginner/intermediate/advanced) gates advice complexity
- `sleepQuality` overrides volume-based fatigue logic
- `recentVolumeLevel` = last session volume vs. historical average (±15% band)
- Muscle-group load elevates or moderates recommendations

**Gaps:**
- `sleepQuality` is used heavily here but it's unclear how consistently it's populated (no fallback if undefined)
- `muscleGroupContext` is optional — when absent, muscle-group logic silently disappears
- No time-between-sessions awareness (rest days, training frequency)
- No exercise-type differentiation (compound vs. isolation treated identically)

---

### `getExerciseTargets.ts`
**Purpose:** Extracts `last`, `best`, and `target` values from an `ExerciseProgression` for display use.  
**Input:** `ExerciseProgression`  
**Output:** `{ last, best, target }` — each is `{ weight, reps } | null`  
**Also exports:** `parseMiddleRep(repRange)` — parses "8–10" → 9 (used for pre-filling inputs)

**Gaps:**
- `best` = highest e1RM session, not necessarily the highest weight session — can be confusing if user is curious about their weight PR

---

### `getExerciseAlternatives.ts`
**Purpose:** Returns up to 3 exercise alternatives from the built-in LIBRARY based on scoring.  
**Input:** `BuiltInExercise`  
**Output:** `ExerciseAlternative[]` — `{ name, reason }`  
**Scoring:**
- +3 same `movementType`
- +2 different `equipment`
- +0.5 per overlapping `secondaryMuscleGroup`
- Quality gate: score > 2

**Gaps:**
- No personalization — does not consider what the user has actually done before
- Does not factor in available equipment from user profile
- `reason` strings are generic ("Same push pattern, different equipment") — could reference muscle groups

---

### `getWorkoutSuggestion.ts`
**Purpose:** In-session hint: detects when reps drop set-to-set at same weight and suggests reducing load.  
**Input:** `SessionExercise`  
**Output:** `WorkoutSuggestion | null` — `{ type: "next_set", title, detail }`  
**Logic:** Triggered only when `prevWeight === lastWeight && lastReps < prevReps`. Suggests `floor(lastWeight × 0.96 / 2.5) × 2.5`.

**Gaps:**
- Only detects reps dropping — no "increase load" suggestion when reps are consistently hitting the top of target range
- Requires `completedAt` timestamps for proper ordering; falls back to array order silently
- Does not factor in warm-up sets at all (already filtered, but no awareness of warmup-to-working transition)
- No session-to-session awareness — purely intra-session

---

### `getWorkoutHighlight.ts`
**Purpose:** Finds the best set (by e1RM) across a flat list of sets from a single workout.  
**Input:** `WorkoutSet[]` — `{ exerciseName, weight, reps }`  
**Output:** `WorkoutHighlight | null` — adds `estimated1RM`  
**Use case:** Post-workout summary "best set of the session" card.

**Gaps:**
- Only computes e1RM — no volume, no comparison to previous workouts (no "PR" detection)
- Does not exclude warm-up sets — caller must pre-filter if needed

---

### `app/lib/recommendations.ts` (referenced, not in `lib/analysis/`)
**Purpose:** Produces a concrete `NextTarget` (weight + rep range) based on trend + recent sessions.  
**Exports:**
- `countFlatSessions(sessions)` → `number` — trailing sessions at same weight+reps
- `computeNextTarget(sessions, trend)` → `NextTarget | null`

**Logic:**
| Trend | Action |
|-------|--------|
| up | +2.5 kg, same rep range |
| flat < 3 sessions | same weight, +2 reps |
| flat ≥ 3 sessions | +2.5 kg, allow -1 rep |
| down | -2.5 kg, same reps |
| mixed | same weight, +2 reps |
| none | echo last session |

**Gaps:**
- Increment is always fixed at 2.5 kg regardless of exercise (deadlift vs. lateral raise)
- No awareness of user goal — same increment for strength vs. hypertrophy
- `countFlatSessions` counts only identical weight+reps — e1RM-flat sessions at slightly different combos are invisible to it

---

## Data Available but Not Used

| Data | Where it lives | Not used in |
|------|---------------|-------------|
| `totalVolume` per session | `ExerciseSession.totalVolume` | `analyzeExerciseHistory.ts` (only used in `smartCoach` via `recentSessions`) |
| `volumeDeltaPct` | Field in `ExerciseAnalysisResult` | Always `null` — never computed |
| Set-level `completedAt` timestamps | `ExerciseSet.completedAt` | Rest time between sets, set duration analysis |
| `rpeRating` (if stored) | — | Not tracked anywhere in analysis |
| Number of sets per session | Available via `workingSets.length` | Not used — only top set feeds analysis |
| Historical warm-up sets | Filtered out explicitly | Never analyzed for readiness/fatigue signals |
| Training day / split context | `WorkoutSession` metadata | `analyzeExerciseHistory` can't distinguish "Push A" vs "Push B" — cross-day volume comparison is blocked |

---

## Key Weaknesses

1. **Two coexisting trend systems** — `analyzeExercise.ts` (4 states) and `analyzeExerciseHistory.ts` + `interpretProgression.ts` (6 states) classify the same data differently. The older one should be deleted.

2. **Volume signal is partial** — `totalVolume` is calculated and stored but never drives recommendations. `smartCoach.ts` uses volume comparisons, but only at the exercise level via session history, not across muscle groups during analysis.

3. **Fixed 2.5 kg increment** — `computeNextTarget` ignores exercise type. Appropriate for barbell lifts; inappropriate for dumbbells, cables, and isolation exercises.

4. **No in-session "load increase" trigger** — `getWorkoutSuggestion.ts` only suggests reducing load. There is no counterpart that says "you've hit the top of your rep range — go heavier next set."

5. **`sleepQuality` dependency in smartCoach** — used in multiple branches but it's unclear if it's reliably populated from the user profile; no safe default behaviour documented.

6. **`exerciseMetrics.ts` imports a hook** — `getSessionDate` from `useWorkout` creates a coupling between analysis and UI layers, violating the "no UI imports in lib/analysis/" rule.

7. **`getWorkoutHighlight.ts` does not exclude warm-ups** — returns the best e1RM from all sets passed in; caller responsibility to filter. Easy to misuse.
