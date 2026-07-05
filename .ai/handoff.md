# Gym-Micro Handoff

## Read first

- `README.md` for stack, setup, and deployment basics.
- `.ai/garou-ii-workout-seed-handoff.md` for the GAROU II seeded-workout implementation plan.

## Current task handoff: GAROU II seeded workout

A handoff has been created for implementing a future seed that inserts the transcribed `GAROU II` workout plan as a selectable workout plan.

Important verified facts:

- Workout plans are `routines` in schema/code; UI copy says “Workout Plans.”
- `/routines` is the plan list/editing UI.
- `/sessions` is where users select the active workout plan and start sessions.
- `/workouts` redirects to `/sessions`.
- Routines are per-user: `routines.user_id` is required, and both `/routines` and `/sessions` only query the current user’s routines.
- Existing duplicate-safe seed convention is `routines.preset_key`, checked with `user_id`; there is no DB-level unique index for `(user_id, preset_key)`.
- Routine-day plans use `routine_days` and `routine_day_exercises` with `sort_order` for day/exercise ordering.
- The current routine-day exercise schema supports only one nullable `target_reps` and no `timerSec` field; per-set rep arrays and timers require deliberate lossy mapping or schema/UI work.

Do not implement the GAROU II seed unless separately requested. The recommended future implementation is a new script `scripts/db-seed-garou-ii-plan.mjs` plus a package script such as `db:seed:garou-ii`, following the existing `scripts/db-seed-garou-plan.mjs` pattern.

## Commands

Common verification commands:

```bash
npm run db:migrate
npm run db:list:exercises
npm run db:list:exercises -- --csv
npm run lint
npm run build
```

Existing seed command:

```bash
npm run db:seed:garou
```

Proposed future GAROU II seed command, after implementation:

```bash
npm run db:seed:garou-ii -- --list-users
npm run db:seed:garou-ii -- --user <username|email|user-id>
npm run db:seed:garou-ii -- --user <username|email|user-id> --set-active
```
