# GAROU II Workout Seed Handoff

Purpose: document the implemented seed for the provided transcribed workout plan so it appears as a selectable workout plan in Gym-Micro after deployment.

Implemented seed files:

- `scripts/db-seed-garou-ii-plan.mjs`
- `package.json` script: `db:seed:garou-ii`

The seed is non-destructive/idempotent at the script level and only writes data when run explicitly.

## Inspection sources

Repo-local memory/docs read first:

- `README.md`
- `TODO.md`
- `FUTURE_SCALING_CONSTRAINTS.md`
- `research.md`
- `plan.md`
- `execute.md`
- `RESEARCH_PLAN.md`

No `AGENTS.md`, `CLAUDE.md`, `.ai/`, or `.hermes/` project-memory files existed before this handoff was created.

Workout/routine files inspected:

- `src/db/schema.ts`
- `drizzle/0001_superb_aaron_stack.sql`
- `scripts/db-seed-garou-plan.mjs`
- `scripts/db-list-exercises.mjs`
- `src/app/(app)/routines/page.tsx`
- `src/components/routine-plan-list.tsx`
- `src/components/routine-day-flyover.tsx`
- `src/app/(app)/sessions/page.tsx`
- `src/app/(app)/sessions/[id]/page.tsx`
- `src/app/(app)/workouts/page.tsx`
- `src/server/actions.ts`
- `package.json`

## Verified data model

Workout plans are stored as `routines`; UI copy calls them “Workout Plans.”

Use these tables/fields for a seeded routine-day plan:

### `exercises`

Defined in `src/db/schema.ts`.

Fields to use:

- `id` uuid primary key
- `name` text, required
- `category` text, required, default `strength`
- `muscle_group` text, nullable (`muscleGroup` in Drizzle)
- `created_by_user_id` uuid nullable; use `null` for shared seed exercises
- `created_at` timestamp

Important constraints:

- There is **no unique index** on `exercises.name`.
- Existing seed logic reuses the first existing row with an exact matching `name`, ordered by `created_at asc`, then creates missing exercises.
- Duplicate exercise names are therefore possible if seed logic is not careful.

### `routines`

Fields to use:

- `id` uuid primary key
- `user_id` uuid required; routines are per-user
- `name` text required
- `description` text nullable
- `is_preset` boolean required default `false`; use `true` for seeded plans
- `preset_key` text nullable; use for duplicate prevention
- `created_at`, `updated_at`

Important constraints:

- There is an index on `(user_id, created_at)` only.
- There is **no DB-level unique constraint** on `(user_id, preset_key)`.
- Duplicate prevention is currently script-level, not database-enforced.

### `routine_days`

Fields to use:

- `id` uuid primary key
- `routine_id` uuid required, FK to `routines.id`, cascade delete
- `day_name` text required (`dayName` in Drizzle)
- `sort_order` integer required default `0`
- `created_at`

Ordering:

- `/routines` and `/sessions` read days ordered by `sort_order asc`.
- Preserve plan order with zero-based `sort_order`: day 1 => `0`, day 2 => `1`, etc.

### `routine_day_exercises`

Fields to use:

- `id` uuid primary key
- `routine_day_id` uuid required, FK to `routine_days.id`, cascade delete
- `exercise_id` uuid required, FK to `exercises.id`, cascade delete
- `sort_order` integer required default `0`
- `target_sets` integer required default `3`
- `target_reps` integer nullable
- `target_weight` numeric(8,2) nullable

Unsupported by current schema:

- Per-set reps arrays like `[7, 6, 5]`
- Rest timer seconds (`timerSec`)
- Notes on planned exercises

Ordering:

- `/routines` and `/sessions/[id]` read day exercises ordered by `sort_order asc`.
- Preserve exercise order with zero-based `sort_order` within each day.

### `user_preferences`

Fields relevant to seeded plan visibility:

- `user_id` uuid primary key
- `active_routine_id` uuid nullable FK to `routines.id`, set null on delete
- `weight_unit`, `theme_overrides`, `updated_at`

Use only if setting the seeded routine active.

## Verified UI visibility behavior

### `/routines`

`src/app/(app)/routines/page.tsx` selects all `routines` where `routines.userId === current userId`, ordered by newest first, then loads `routine_days` and `routine_day_exercises`.

A seeded plan appears in “Your Workout Plans” if:

1. It is inserted into `routines` for the logged-in user’s `user_id`.
2. It has at least one `routine_days` row to be useful.
3. Its day exercises point to existing `exercises` rows.

No frontend change is needed for visibility in `/routines` if the seed creates those rows.

### `/sessions`

`src/app/(app)/sessions/page.tsx` selects all user routines for the “Workout plan” active-plan dropdown.

A seeded plan appears as selectable in `/sessions` if it exists in `routines` for that user. It does **not** need to be active to appear in the plan select.

To start a session from it, the user must either:

- select it in `/sessions` and save it as active, or
- the seed must set `user_preferences.active_routine_id` to the seeded routine.

Recommendation: do **not** set active by default, because that overwrites the user’s current active plan. Keep `--set-active` as an explicit opt-in.

### `/sessions/[id]`

The session detail page reads the selected day’s `routine_day_exercises` and uses only:

- exercise identity/name/category/muscle group
- `target_reps`
- `target_weight`

It does not read `target_sets` on the session detail page for logging, although `/routines` displays `target_sets`.

### `/workouts`

`src/app/(app)/workouts/page.tsx` redirects to `/sessions`. Do not use `/workouts` as the workout-plan list.

## Existing seed behavior to copy

Existing seed: `scripts/db-seed-garou-plan.mjs`

Verified behavior:

- Constant `PRESET_KEY = "garou-bench-weekly-v1"`.
- Requires `DATABASE_URL` through `scripts/run-with-env.mjs` in package script.
- CLI supports:
  - `--user <username|email|user-id>`
  - `--list-users`
  - `--set-active`
- If no `--user` is provided:
  - uses the only user if exactly one exists,
  - errors if zero users exist,
  - errors and prints users if multiple users exist.
- Starts a transaction for plan creation.
- Checks `routines` by `user_id` + `preset_key` and no-ops when found.
- Creates missing exercises globally with `created_by_user_id = null`.
- Inserts `routines`, `routine_days`, and `routine_day_exercises`.
- Optionally upserts `user_preferences.active_routine_id` when `--set-active` is passed.

This pattern is appropriate for GAROU II with a new script or a carefully generalized seed script.

## Implemented files

A new seed script was created instead of overwriting the existing Garou seed.

- `scripts/db-seed-garou-ii-plan.mjs`
- `package.json` script: `"db:seed:garou-ii": "node scripts/run-with-env.mjs node scripts/db-seed-garou-ii-plan.mjs"`

Do not edit frontend files unless product requirements change. Current routes already display and select per-user routines.

Optional, only if you want DB-enforced idempotency:

- Add a migration and schema index for a unique partial constraint on `(user_id, preset_key)` where `preset_key is not null`.
- This is not required to follow the existing seed convention and would be broader than a simple seed.

## Implemented seed script shape

The implementation mirrors `scripts/db-seed-garou-plan.mjs`:

1. Defines constants:
   - `PRESET_KEY = "garou-ii-v1"`
   - `PLAN.name = "GAROU II"`
   - `PLAN.description = "6-day push/pull/lower/Garou workout plan transcribed from screenshots. Per-set reps were collapsed to a single target_reps value because routine_day_exercises supports only one target_reps field."`
2. Represents days with explicit ordered arrays.
3. Reuses day 1 exercise data for `PUSH 2` and day 2 exercise data for `PULL 2` while inserting distinct routine days.
4. Stores source reps arrays and `timerSec` in script data for auditability, but inserts only `target_reps` because the current schema has no per-set reps or timer fields.
5. Uses exact exercise names from the supplied plan.
6. In `ensureExercises`:
   - collect unique exercise names,
   - query existing rows with exact `name = any(...)`, ordered by `created_at asc`,
   - map first existing ID per name,
   - insert missing rows as `{ name, category: "strength", muscle_group: <plan muscle>, created_by_user_id: null }`.
7. In `seedPlan` transaction:
   - check `routines` by `user_id` + `preset_key`, no-op if found,
   - insert routine with `is_preset = true`,
   - insert routine days with zero-based `sort_order`,
   - insert day exercises with zero-based `sort_order`, `target_sets`, mapped `target_reps`, and `target_weight = null`,
   - optionally upsert `user_preferences.active_routine_id` on `--set-active`.
8. Keep `--list-users`, `--user`, and `--set-active` support.
9. Keep the seed non-destructive by default.

## Duplicate-safe/idempotent strategy

Minimum strategy matching current repo convention:

- Use `PRESET_KEY = "garou-ii-v1"`.
- Before insert, query:
  - `select id, name from routines where user_id = $userId and preset_key = $presetKey limit 1`
- If found, print “No changes made” and return the existing routine ID.
- If not found, create the plan in one transaction.

Tradeoffs:

- This prevents duplicate routine creation for normal/manual seed runs.
- It is not race-proof because there is no DB unique index on `(user_id, preset_key)`.
- For this small app/manual deploy seed pattern, script-level idempotency matches the existing repo approach.

If source plan corrections are needed later:

- If changes should create a distinct selectable plan, use a new `preset_key` such as `garou-ii-v2`.
- If changes should update the existing GAROU II plan, add an explicit `--replace` or `--update-existing` mode that deletes/recreates child rows inside a transaction. Do not silently mutate a user’s existing plan without an explicit flag.

## How to choose `preset_key`

Use a lowercase stable slug plus version:

- Recommended initial key: `garou-ii-v1`

Rules:

- Do not reuse `garou-bench-weekly-v1` from the existing Garou seed.
- Keep the key stable for reruns of the same seed.
- Increment the suffix only if the plan should coexist as a new preset/version.
- Reusing the same key means reruns should be no-ops unless an explicit update mode is implemented.

## Active routine recommendation

Default behavior: **do not set active**.

Reason:

- The user asked for the workout to appear as selectable after deployment.
- `/sessions` already lists all user routines in the active-plan selector.
- Setting active changes the user’s current workflow and should be opt-in.

Support an explicit flag:

```bash
npm run db:seed:garou-ii -- --user <username|email|user-id> --set-active
```

## Mapping GAROU II into verified schema

Global plan values:

- `routines.name`: `GAROU II`
- `routines.description`: concise note that per-set reps were collapsed because schema supports only one `target_reps`
- `routines.is_preset`: `true`
- `routines.preset_key`: `garou-ii-v1`
- `routine_days.sort_order`: day number minus one
- `routine_day_exercises.sort_order`: exercise position minus one
- `routine_day_exercises.target_sets`: source `sets`
- `routine_day_exercises.target_reps`: **max of source `reps` array**
- `routine_day_exercises.target_weight`: `null`
- `exercises.category`: `strength` for all supplied exercises
- `exercises.muscle_group`: source `muscle` string
- `timerSec`: ignored; no verified schema/UI field supports it

### Per-set reps mapping decision

Current schema supports only a single nullable integer `target_reps`. The supplied plan has per-set arrays.

Recommended deliberate mapping: use `max(reps)` as `target_reps`.

Reason:

- The UI displays one “X reps” target and uses it as the first default prefill when no recent set history exists.
- `max(reps)` preserves the highest intended target and avoids under-prescribing descending/variable sets.
- Most source arrays are constant, so this only changes variable cases like `[7, 6, 5]`, `[5, 7, 6]`, and `[8, 5, 5]`.

Tradeoff:

- Exact per-set progression is lost. There is no verified field to store `[7, 6, 5]` without a schema/UI change.
- Do not encode rep arrays into exercise names; that would pollute canonical exercise names.

### Day/exercise mapping table

Total rows after expansion:

- 6 routine days
- 41 planned day-exercise entries
- 22 unique exercise names

#### Day 1 — PUSH 1

| order | exercise | muscle_group | target_sets | source reps | target_reps |
|---:|---|---|---:|---|---:|
| 0 | Barbell Overhead Front Raise | Shoulders | 3 | [7, 6, 5] | 7 |
| 1 | Barbell Bench Press | Chest | 3 | [5, 5, 5] | 5 |
| 2 | Dumbbell Deep Push-Up | Chest | 3 | [10, 10, 10] | 10 |
| 3 | Dumbbell Incline Fly | Chest | 3 | [12, 12, 12] | 12 |
| 4 | Dumbbell Front Raise | Shoulders | 3 | [15, 15, 15] | 15 |
| 5 | EZ Bar Decline Close Grip Skull Crusher | Triceps | 3 | [5, 7, 6] | 7 |
| 6 | Sit-Up | Abs | 3 | [15, 15, 15] | 15 |

#### Day 2 — PULL 1

| order | exercise | muscle_group | target_sets | source reps | target_reps |
|---:|---|---|---:|---|---:|
| 0 | Pull-Up | Back | 3 | [5, 5, 5] | 5 |
| 1 | Barbell Bent-Over Row | Back | 3 | [8, 5, 5] | 8 |
| 2 | Dumbbell Lateral Raise | Shoulders | 3 | [8, 8, 8] | 8 |
| 3 | Inverted Barbell Row | Back | 3 | [8, 8, 8] | 8 |
| 4 | Dumbbell Posterior Fly on Stability Ball | Shoulders | 3 | [8, 8, 8] | 8 |
| 5 | Barbell Spider Curl | Biceps | 3 | [8, 8, 8] | 8 |
| 6 | Weight Plate Russian Twist | Abs | 3 | [8, 8, 8] | 8 |

#### Day 3 — LOWER

| order | exercise | muscle_group | target_sets | source reps | target_reps |
|---:|---|---|---:|---|---:|
| 0 | Barbell Squat | Upper Legs | 3 | [10, 10, 10] | 10 |
| 1 | Barbell Romanian Deadlift | Upper Legs | 3 | [8, 8, 8] | 8 |
| 2 | Kettlebell Goblet Squat | Upper Legs | 3 | [10, 10, 10] | 10 |
| 3 | Barbell Stiff-Leg Deadlift | Back | 3 | [10, 10, 10] | 10 |
| 4 | Dumbbell Calf Raise | Lower Legs | 3 | [20, 20, 20] | 20 |
| 5 | Hanging Leg Raise | Abs | 3 | [8, 8, 8] | 8 |

#### Day 4 — PUSH 2

Same exercise sequence and mapped targets as Day 1, with `routine_days.day_name = "PUSH 2"` and `routine_days.sort_order = 3`.

#### Day 5 — PULL 2

Same exercise sequence and mapped targets as Day 2, with `routine_days.day_name = "PULL 2"` and `routine_days.sort_order = 4`.

#### Day 6 — GAROU DAY

| order | exercise | muscle_group | target_sets | source reps | target_reps |
|---:|---|---|---:|---|---:|
| 0 | Pull-Up | Back | 3 | [5, 5, 5] | 5 |
| 1 | Dumbbell Lateral Raise | Shoulders | 3 | [8, 8, 8] | 8 |
| 2 | Barbell Curl | Biceps | 3 | [8, 8, 8] | 8 |
| 3 | Inverted Barbell Row | Back | 3 | [8, 8, 8] | 8 |
| 4 | Dumbbell Posterior Fly on Stability Ball | Shoulders | 3 | [8, 8, 8] | 8 |
| 5 | Dumbbell Alternating Bicep Curl | Biceps | 3 | [12, 12, 12] | 12 |
| 6 | Hanging Leg Raise | Abs | 3 | [8, 8, 8] | 8 |

## Commands

### Local prerequisite commands

```bash
npm install
npm run db:migrate
```

### Exercise-name audit before implementing/running seed

```bash
npm run db:list:exercises
npm run db:list:exercises -- --csv
```

Use the CSV output to decide whether exact transcribed names should be kept or mapped to existing canonical exercise names. Do not assume aliases.

### Seed commands after adding the future script

```bash
npm run db:seed:garou-ii -- --list-users
npm run db:seed:garou-ii -- --user <username|email|user-id>
npm run db:seed:garou-ii -- --user <username|email|user-id> --set-active
```

Environment alternatives should match existing seed convention:

```bash
SEED_USER=<username|email|user-id> npm run db:seed:garou-ii
SEED_SET_ACTIVE=1 SEED_USER=<username|email|user-id> npm run db:seed:garou-ii
```

### Verification commands

```bash
npm run lint
npm run build
```

No `npm test` script or test suite was found in `package.json` or repo search. If tests are added later, run them too.

### Deployment commands/process

Current README says Coolify post-deploy/release should run:

```bash
npm run db:migrate
```

To make GAROU II appear after deployment, also run the seed against the production database/user after migrations:

```bash
npm run db:seed:garou-ii -- --list-users
npm run db:seed:garou-ii -- --user <production-username-or-email>
```

Only use `--set-active` if the product owner wants GAROU II to become the active plan immediately.

Open deployment question: Coolify currently documents migrations, not seed execution. Decide whether seed is a one-off manual production command or a release command. For a per-user seed, manual/targeted execution is safer than automatic every deploy.

## Validation checklist

After implementing and running the seed locally or in production:

1. Run the seed once for the target user.
2. Run the same seed a second time and confirm it prints no changes made and does not add a duplicate `GAROU II` routine.
3. Visit `/routines` as the target user:
   - `GAROU II` appears in “Your Workout Plans.”
   - It has 6 days in this order: `PUSH 1`, `PULL 1`, `LOWER`, `PUSH 2`, `PULL 2`, `GAROU DAY`.
   - Day 1 and Day 4 contain the same 7 exercises in the same order.
   - Day 2 and Day 5 contain the same 7 exercises in the same order.
   - Day 3 contains 6 exercises.
   - Day 6 contains 7 exercises.
   - Exercise cards show mapped sets/reps.
4. Visit `/sessions` as the target user:
   - `GAROU II` appears in the workout-plan select.
   - If not active, selecting it and saving makes it current.
   - Once active, the day selector shows the six days in order.
5. Start one session from a GAROU II day:
   - Session title shows `GAROU II / <day name>`.
   - Log Set exercise dropdown/options are limited to the selected day’s planned exercises.
   - First-time `prefillReps` matches mapped `target_reps` where no recent set history overrides it.
6. Run:
   - `npm run lint`
   - `npm run build`

Optional direct DB spot checks:

```sql
select id, name, is_preset, preset_key
from routines
where user_id = '<target-user-id>' and preset_key = 'garou-ii-v1';

select rd.sort_order, rd.day_name, e.name, rde.sort_order, rde.target_sets, rde.target_reps, rde.target_weight
from routines r
join routine_days rd on rd.routine_id = r.id
join routine_day_exercises rde on rde.routine_day_id = rd.id
join exercises e on e.id = rde.exercise_id
where r.user_id = '<target-user-id>' and r.preset_key = 'garou-ii-v1'
order by rd.sort_order, rde.sort_order;
```

## Risks and open questions

1. **Per-user vs global preset strategy**
   - Verified: `routines.user_id` is required and both `/routines` and `/sessions` query only current-user routines.
   - Current seed strategy is per-user.
   - Open question: should every future user get GAROU II automatically? If yes, a seed alone is not enough; add an onboarding/copy-preset flow or a signup hook.

2. **Deployment seed execution**
   - README documents `npm run db:migrate` for Coolify, not seeders.
   - Open question: should GAROU II be seeded manually once in production, or added to release/deploy commands?
   - Recommendation: manual targeted production seed unless the app gains a robust global preset system.

3. **No DB unique constraint for preset keys**
   - Existing seed convention is script-level idempotency.
   - Risk is low for manual execution, but concurrent runs could duplicate.
   - Optional mitigation: add unique partial index on `(user_id, preset_key)` where preset_key is not null.

4. **Exercise names are not unique**
   - Use exact-name reuse/create behavior, but audit with `npm run db:list:exercises -- --csv` first.
   - Open question: should transcribed names be canonicalized to existing exercise names?

5. **Unsupported `timerSec`**
   - No verified schema or UI field stores rest seconds per planned exercise.
   - Ignore for seed unless a schema/UI change is approved.

6. **Unsupported per-set reps**
   - Seed must collapse arrays to one `target_reps` or wait for schema changes.
   - Recommended mapping is `max(reps)` with the tradeoff documented above.

7. **Transcription uncertainty**
   - Source plan was transcribed from screenshots and some repeated rep entries were inferred.
   - Keep source reps arrays in seed constants for review, even though only mapped `target_reps` is inserted.

8. **Frontend changes**
   - Not needed for the plan to appear in `/routines` and `/sessions` for a target user.
   - Needed only if product requirements include global presets, automatic availability for every user, timer display, per-set target display, or a dedicated `/workouts` plan route.

## Skill recommendation

A project-specific Hermes skill is useful here because the workout seeding workflow is repo-specific and easy to get subtly wrong:

- `routines` are per-user despite UI “Workout Plans.”
- `preset_key` is the duplicate-safe convention but not DB-enforced.
- Day/exercise order depends on `sort_order`.
- `/workouts` redirects to `/sessions`; `/routines` is the plan list.
- The schema cannot store timers or per-set reps.

Create or keep a Hermes skill named `gym-micro-workout-seeding` for future workout seed tasks.
