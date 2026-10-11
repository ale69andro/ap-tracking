# AP-Tracking — CLAUDE.md

## Project Overview
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Framer Motion

Fitness tracking app with intelligent coach engine. Primary use case: one-handed phone use during active workout sets.

---

## Core Principles
- Speed > Complexity
- Clarity > Feature overload
- Intelligence should support, not slow down, the user
- A set must be loggable in under 2 seconds

---

## Architecture — Know Before You Touch

### Folder Responsibilities
| Folder | Purpose | Rule |
|--------|---------|------|
| `lib/analysis/` | Coach engine (scoring, trends, recommendations) | No UI imports |
| `app/hooks/` | All stateful logic | No direct Supabase in components |
| `app/components/` | Pure UI only | No business logic |
| `app/lib/` | App-level calculations | Thin wrappers only |
| `app/types.ts` | Single source of truth for all types | Extend here, nowhere else |
| `dashboard/page.tsx` | Already too large — ~1,070 lines, 25 `useState` calls | Do NOT add state here |

### Data Flow (always follow this)
User Action → Hook Callback → optimistic setState → Supabase upsert → Re-render

### Active Session Persistence
- `ap_active_workout` (localStorage) — survives page refresh
- Supabase sync runs after localStorage update
- Always check both when debugging session state

### Coach Engine Layers (do not mix)
1. `app/lib/progression.ts` — Session scoring (max e1RM via Epley, `lib/analysis/calculate1RM.ts`)
2. `app/lib/progression.ts` — Trend classification (last 5 sessions, min. 3, half-average comparison, 3% threshold)
3. `lib/analysis/analyzeExerciseHistory.ts` — Per-exercise analysis (4-state session trend, e1RM/volume deltas)
4. `lib/analysis/interpretProgression.ts` — 6-state interpretation (NOISE/SLIGHT/CLEAR thresholds)
5. `lib/analysis/buildTrainingProfile.ts` — `UserProfile` + daily check-in → `TrainingProfile` (recovery tier)
6. `lib/analysis/smartCoach.ts` — Coach message by status × experience × goal × recovery tier × frequency
7. `app/lib/recommendations.ts` — Next-session targets (double progression, per-equipment increments)
8. `lib/analysis/getExerciseRecommendation.ts` — Central engine: combines 3–7 into one structured recommendation
9. `lib/analysis/getWorkoutSuggestion.ts`, `detectBadDayDuringWorkout.ts` — In-session coaching

Volume layer (separate from the per-exercise chain): `getWeeklyVolumeByMuscleGroup.ts` → `adaptiveVolume.ts` → `adaptiveVolumeRecommendations.ts`; `getDashboardCoachSignal.ts` aggregates both into the dashboard verdict.

Details and known gaps per file: `ANALYSIS_SUMMARY.md`.

---

## Agent Delegation
During implementation, delegate tasks to the following agents based on their expertise:

- **bug-hunter** — something is broken, not saving, wrong value, Supabase sync issue, localStorage inconsistency
- **feature-architect** — planning where a new feature belongs, deciding hook vs. component vs. lib
- **ui-auditor** — layout, spacing, mobile usability, active set clarity, rest timer readability
- **coach-tester** — writing tests for coach engine, validating thresholds, progression logic

When in doubt: use `feature-architect` before implementing anything new.

---

## UX Rules
- Minimal clicks
- Auto-fill previous set values
- Rest timer starts automatically after set completion
- Large touch-friendly inputs, one-hand usability
- Suggestions visible but never intrusive
- Active set: always highest visual priority

---

## Design Rules
- Black / Red theme, high contrast, no clutter
- Tailwind utility classes only — no new CSS files
- Framer Motion already in use — extend, don't replace
- Clear hierarchy: active set → completed sets (compact) → coach hint

---

## Code Rules
- No logic in `page.tsx` — extract to hooks
- No direct Supabase calls in components — always via hooks
- New stateful logic → new hook in `app/hooks/`
- New coach logic → new file in `lib/analysis/`
- New types → `app/types.ts` only
- Always use `try/finally` for async operations (reset loading state)
- No `any` types
- Prefer the set helpers in `app/lib/workout.ts` (`getEffectiveSets()`, `getWorkingSets()`, `getCompletedSets()`) over inline `type !== "Warm-up"` comparisons
- The exercise name is the exercise identity (history, coach, block, prescriptions, PRs). A unilateral exercise is its name plus `" (Uni)"` and therefore a separate exercise. Never build, strip, or normalise that suffix by hand — use `app/lib/exerciseVariant.ts`. Catalog metadata is looked up via `findBuiltIn()`, which ignores the suffix

---

## Feature Philosophy
Only add features that improve speed, clarity, or training quality.
Think from two perspectives:
- **User during workout** — focus, speed, minimal friction
- **Coach perspective** — analysis, progression, adaptive recommendations

---

## Workflow (always follow this order)
1. Analyze current implementation
2. Propose minimal plan — wait for approval
3. Implement only what was approved
4. Do not touch unrelated code
5. `npm run lint`
6. Summarize: changed files + what was tested

## Commands
- `npm run dev`
- `npm run lint`
- `npm test` (Vitest, `*.test.ts` next to the source)
- `npm run build`

---

## Known Architecture Debt (do not ignore)
- `dashboard/page.tsx` — God component, gradual extraction ongoing
- No unit tests for coach engine thresholds yet (Vitest is installed; covered so far: block calculation, exercise variant helpers, progression grouping)
- Error boundaries missing (no `error.tsx` / `global-error.tsx`) — async errors currently fail silently
- `exerciseMetrics.ts` — only `getTopSet` carries real logic; `calculateEpley1RM` is an alias for `calculate1RM`, `getRelevantWorkingSets` and `calculateSessionVolume` are unused — candidate for removal
- `app/components/dev/PrescriptionQAPanel.tsx` calls Supabase directly from a component (dev-only, but breaks the hook rule)
- `supabase/migrations/` has no `CREATE TABLE` for `workout_sessions`, `workout_templates`, `user_exercises`, `exercise_prescriptions`, `user_profiles` — schema is not reproducible from the repo