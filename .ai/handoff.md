# Gym-Micro Handoff

## Read first

- `README.md` for stack, setup, and deployment basics.
- `.ai/garou-ii-workout-seed-handoff.md` for the GAROU II seeded-workout implementation plan.

## Current task handoff: GAROU II seeded workout

The `GAROU II` seed has been implemented as a non-destructive per-user seed that inserts the transcribed workout plan as a selectable workout plan when explicitly run.

Important verified facts:

- Workout plans are `routines` in schema/code; UI copy says “Workout Plans.”
- `/routines` is the plan list/editing UI.
- `/sessions` is where users select the active workout plan and start sessions.
- `/workouts` redirects to `/sessions`.
- Routines are per-user: `routines.user_id` is required, and both `/routines` and `/sessions` only query the current user’s routines.
- Existing duplicate-safe seed convention is `routines.preset_key`, checked with `user_id`; there is no DB-level unique index for `(user_id, preset_key)`.
- Routine-day plans use `routine_days` and `routine_day_exercises` with `sort_order` for day/exercise ordering.
- The current routine-day exercise schema supports only one nullable `target_reps` and no `timerSec` field; per-set rep arrays and timers require deliberate lossy mapping or schema/UI work.

Implemented files:

- `scripts/db-seed-garou-ii-plan.mjs`
- `package.json` script: `db:seed:garou-ii`

The seed follows the existing `scripts/db-seed-garou-plan.mjs` pattern: `--user`, `--list-users`, `--set-active`, per-user `preset_key` duplicate prevention, exact-name exercise reuse, missing exercise creation, and optional active-plan assignment.

## Commands

Common verification commands:

```bash
npm run db:migrate
npm run db:list:exercises
npm run db:list:exercises -- --csv
npm run lint
npm run build
```

Existing seed commands:

```bash
npm run db:seed:garou
npm run db:seed:garou-ii -- --help
```

GAROU II seed commands:

```bash
npm run db:seed:garou-ii -- --list-users
npm run db:seed:garou-ii -- --user <username|email|user-id>
npm run db:seed:garou-ii -- --user <username|email|user-id> --set-active
```
