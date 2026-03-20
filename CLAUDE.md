# AP-Tracking

## Purpose
AP-Tracking is a fast, minimal fitness tracking app with intelligent training analysis.

Core focus:
- fast workout logging
- progression tracking
- performance analysis
- smart recommendations

---

## Core Principles
- Speed > Complexity
- Clarity > Feature overload
- Intelligence should support, not slow down, the user

The user should be able to log a set in under 2 seconds.

---

## UX Rules
- Minimal clicks
- Auto-fill previous set values
- Rest timer starts automatically after completing a set
- Large touch-friendly inputs
- One-hand usability
- Suggestions should be visible but never intrusive

---

## Design Rules
- Black / Red theme
- Clean, minimal UI
- High contrast
- No clutter
- Clear hierarchy (focus on active set)

---

## Data & Logic Rules
- Strict separation between:
  - Templates (blueprints)
  - Workout Sessions (actual data)
- No hidden coupling between template data and workout data
- Analysis logic (progression, stagnation, recommendations) must be isolated from UI
- Avoid duplicated logic across components

---

## Code Rules
- Keep components small and reusable
- Avoid logic in page.tsx
- Use hooks for state logic (e.g. useWorkout)
- Extract complex logic into dedicated services/utils
- Prefer minimal, safe changes over large rewrites
- Do not modify unrelated code

---

## Feature Philosophy
- Only add features that improve:
  - speed
  - clarity
  - or training quality
- Avoid unnecessary complexity
- Think from the user during a workout (focus, speed)
- Think from a coach perspective for analysis features

---

## Workflow for Claude
1. Analyze current implementation
2. Propose minimal plan
3. Implement
4. Run lint

---

## Commands
- npm run dev
- npm run lint
- npm run build

---

## Workflow Rules
1. First analyze current implementation
2. Propose smallest safe plan
3. Do not implement before approval
4. Do not refactor unrelated code
5. After implementation run lint
6. Summarize changed files and test cases