# Gym-Micro: Augmented MVP Architecture Research

## Recommendation Summary
Ship a single Next.js 15 App Router service with Tailwind and Drizzle on PostgreSQL, deployed from Git to Coolify via default Nixpacks (no custom Dockerfile), with Redis, barcode scanning, and file uploads included in MVP.

## 1) Simplest MVP Architecture for Coolify
- One deployable service: Next.js 15 App Router
- One database: PostgreSQL
- One cache/ephemeral store: Redis
- One object storage target for uploads (S3-compatible)
- One ORM/migration layer: Drizzle
- Auth in the same app (no separate auth service)
- Server-side business logic in Route Handlers + Server Actions

This keeps a single application codebase while adding only the extra services required by your explicit feature scope.

## 2) Coolify Deployment Recommendation
Use Coolify Git deployment with Nixpacks defaults.

- Source: Git repository
- Runtime: Node 20/22
- Build command: `npm run build`
- Start command: `npm run start`
- Database: Attach a Coolify PostgreSQL service and set `DATABASE_URL`
- Redis: Attach a Coolify Redis service and set `REDIS_URL`
- Uploads: Configure S3-compatible storage env vars (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`)
- Migrations: Run as post-deploy command (`npm run db:migrate`) or release task

No custom Docker setup should be required unless there is a hard runtime mismatch.

## 3) Recommended Minimal Schema
Core app tables:

1. `users`
   - `id`, `email` (unique), `name`, `created_at`, `updated_at`
2. `exercises`
   - `id`, `name`, `category`, `muscle_group`, `created_by_user_id` (nullable), `created_at`
3. `routines`
   - `id`, `user_id`, `name`, `description` (nullable), `created_at`, `updated_at`
4. `routine_exercises` (required junction for routine composition)
   - `id`, `routine_id`, `exercise_id`, `sort_order`, `target_sets`, `target_reps` (nullable), `target_weight` (nullable)
5. `workout_sessions`
   - `id`, `user_id`, `routine_id` (nullable), `started_at`, `ended_at` (nullable), `status`
6. `workout_sets`
   - `id`, `session_id`, `exercise_id`, `set_order`, `reps`, `weight`, `is_warmup`, `created_at`
7. `foods`
   - `id`, `name`, `barcode_upc` (nullable), `calories_kcal`, `protein_g`, `carbs_g`, `fat_g`, `serving_size_g` (nullable), `created_by_user_id` (nullable)
8. `meal_logs`
   - `id`, `user_id`, `food_id`, `quantity`, `meal_type`, `consumed_at`, `notes` (nullable)
9. `uploads`
   - `id`, `user_id`, `entity_type`, `entity_id`, `object_key`, `mime_type`, `size_bytes`, `created_at`

Minimum indexes/constraints:
- Unique: `users.email`
- Foreign keys on all relational IDs
- Composite indexes:
  - `workout_sessions(user_id, started_at)`
  - `meal_logs(user_id, consumed_at)`
  - `routine_exercises(routine_id, sort_order)`
  - `uploads(entity_type, entity_id)`

Barcode-related indexes:
- Unique nullable index: `foods.barcode_upc`

## 4) MVP Included Extensions
In scope for v1:

1. Redis
   - Use for short-lived cache and API rate-limit buckets
2. Barcode scanning
   - Mobile camera scanning for UPC/EAN food lookup with manual fallback
3. Photo uploads
   - User media upload support via presigned URL flow
4. Object storage (required by uploads)
   - S3-compatible bucket for durable asset storage

## 5) Simplest Auth Approach for MVP
Use Auth.js with one OAuth provider first (Google), and avoid credentials login initially.

Why this is simplest:
- No password reset flow
- No password hashing/storage liability
- Faster implementation and lower security surface for MVP

If enterprise/customer requirements force email+password, add credentials auth in v1.1 with hashed passwords.

## 6) Next.js App Router Boundaries and Structure
Recommended structure:

```text
src/
  app/
    (public)/
    (app)/
    api/
  components/
  db/
    schema.ts
    client.ts
  lib/
    auth.ts
    validation/
  server/
    workouts/
    routines/
    nutrition/
```

Boundary rules:
- `app/` handles routing and UI composition
- `api/` and server actions call domain modules in `server/`
- `server/` owns business rules and DB access orchestration
- `db/` owns schema/migrations/query primitives

## 7) Main Tradeoffs and Risks
1. Single-service architecture
   - Pro: Simple deploy and maintenance
   - Con: Fewer scaling isolation options later
2. OAuth-first auth
   - Pro: Fast and safer MVP auth
   - Con: Users without provider accounts need fallback later
3. No Redis/object storage at launch
   - Not applicable after scope update; these are in v1 by requirement
4. App Router + Server Actions coupling
   - Pro: Fast iteration in one codebase
   - Con: Tighter framework coupling for future extraction

## Non-Essential Dependency Justifications
Only retain non-essential dependencies if justified:

1. `auth.js`
   - Justification: Avoid writing custom auth/session security logic
2. `zod`
   - Justification: Runtime input validation for API/actions; prevents malformed writes
3. `ioredis` (or `redis`)
   - Justification: Required Redis integration for caching and lightweight rate limiting
4. `@zxing/browser` (or equivalent)
   - Justification: Barcode scanning through mobile camera in-browser
5. `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
   - Justification: Direct-to-bucket uploads without proxying large files through app servers
6. `pino` or equivalent logger (optional)
   - Justification: Production diagnostics in Coolify logs

Avoid adding queue systems and image-processing workers in MVP unless performance data forces them.
