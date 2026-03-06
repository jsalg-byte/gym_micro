# Gym-Micro: Rechecked Implementation Plan

## Objective
Execute the MVP with a production-safe architecture: Next.js 15 + Tailwind + Drizzle + PostgreSQL on Coolify from Git, including Redis, barcode scanning, and uploads, with no custom Docker unless forced.

## Phase Plan

### Phase 0: Decision Lock (Human Checkpoint)
1. Confirm auth mode for v1:
   - Default recommendation: OAuth-only via Auth.js (Google)
2. Confirm migration strategy:
   - Recommended: Drizzle SQL migrations committed to repo
3. Confirm MVP boundaries:
   - Include: workouts + meal logs + Redis + barcode + uploads/object storage

Exit criteria:
- You approve the above 3 decisions.

### Phase 1: Project Bootstrap
1. Scaffold Next.js 15 App Router with TypeScript + Tailwind
2. Add Drizzle + Postgres client
3. Add Redis client and storage SDK dependencies
4. Add baseline scripts:
   - `db:generate`
   - `db:migrate`
   - `db:studio` (optional local use)
5. Set `next.config.ts` for standalone output

Exit criteria:
- `npm run build` passes locally
- Project boots cleanly with no runtime errors

### Phase 2: Schema + Auth Foundation
1. Implement minimal schema:
   - `users`, `exercises`, `routines`, `routine_exercises`
   - `workout_sessions`, `workout_sets`, `foods`, `meal_logs`, `uploads`
2. Generate initial migration and apply locally
3. Wire Auth.js (OAuth-only unless you override)
4. Add route protection for app pages/APIs
5. Add Redis connectivity check and cache primitives

Exit criteria:
- Auth login works
- Migrations apply successfully
- Protected pages reject unauthenticated access

### Phase 3: MVP Feature Vertical Slices
1. Workout slice:
   - Exercise list
   - Routine CRUD
   - Start session + log sets
2. Nutrition slice:
   - Food CRUD (manual entry)
   - Meal logging and daily history
   - Barcode scan and lookup path
3. Upload slice:
   - Presigned upload URL API
   - Attach uploaded media to supported entities
4. Basic mobile-first UI pass for core screens

Exit criteria:
- End-to-end workout flow works
- End-to-end meal logging flow works

### Phase 4: Coolify Deployment
1. Configure Coolify app from Git
2. Attach PostgreSQL + Redis services and environment variables
3. Configure S3-compatible object storage environment variables
4. Configure migration execution during deploy
5. Smoke test deployed app:
   - `/api/health`
   - auth flow
   - create routine, log set, log meal
   - barcode scan lookup
   - upload and fetch signed asset URL

Exit criteria:
- Successful deployment without custom Dockerfile
- Core flows work in deployed environment

## Risk Controls
1. Scope creep
   - Control: enforce strict in-scope definitions for Redis/barcode/uploads
2. Schema churn
   - Control: keep migration granularity small and reviewed
3. Auth delays
   - Control: start with OAuth-only and defer credentials
4. Deployment friction
   - Control: rely on Nixpacks defaults first; Dockerfile only if required
5. External API reliability (barcode food lookup)
   - Control: support manual UPC and manual food entry fallback
6. Storage misconfiguration
   - Control: presigned URL integration tests before production rollout

## Definition of Done
1. Deliverables from research are implemented and validated
2. Coolify deployment is stable from Git repo
3. Redis + barcode + uploads work end-to-end in production
