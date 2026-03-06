# Gym-Micro: Execute Checklist (Human-in-Loop)

Use this file as the live execution runbook. Do not skip checkpoint items.

## 0) Preflight
- [x] Confirm working branch (`codex/gym-micro-mvp` recommended)
- [x] Confirm Node version target (20 or 22)
- [x] Confirm package manager (`npm`)
- [ ] Confirm Coolify project exists and Git access is ready

### Human checkpoint A (required)
- [x] You approve auth choice for v1:
  - recommended default: OAuth-only (Google) with Auth.js
- [x] You confirm `Redis + barcode + uploads` are mandatory v1 scope

## 1) Scaffold and Base Config
- [x] Scaffold Next.js 15 App Router with TypeScript + Tailwind
- [x] Set `next.config.ts` to standalone output
- [x] Install and configure Drizzle + Postgres client
- [x] Install Redis client + barcode scanner + S3 SDK dependencies
- [x] Add scripts: `db:generate`, `db:migrate`, `db:studio`

### Human checkpoint B (required)
- [ ] You confirm generated project structure and naming before schema implementation

## 2) Data Layer
- [x] Implement schema tables:
  - `users`
  - `exercises`
  - `routines`
  - `routine_exercises`
  - `workout_sessions`
  - `workout_sets`
  - `foods`
  - `meal_logs`
  - `uploads`
- [x] Add barcode field/index strategy for foods
- [x] Generate first migration
- [x] Apply migration locally

### Human checkpoint C (required)
- [ ] You review schema fields, especially workout and nutrition logging fields

## 3) Auth and Access Control
- [x] Wire Auth.js
- [x] Add sign-in route/page
- [x] Protect app routes and mutation APIs
- [x] Verify session access on server and client paths

### Human checkpoint D (required)
- [ ] You test login/logout and confirm UX is acceptable for MVP

## 4) MVP Features
- [x] Exercise list
- [x] Routine create/list/update/delete
- [x] Start workout session and log sets
- [x] Food create/list
- [x] Meal logging and daily history
- [x] Barcode scan flow (camera + manual fallback)
- [x] Redis-backed caching/rate-limit primitives
- [x] Upload flow (presigned URL + persisted upload metadata)

### Human checkpoint E (required)
- [ ] You run the 5 core flows:
  - create routine
  - log workout set
  - log meal
  - scan barcode and log a matched food
  - upload media and view linked entity

## 5) Deployment to Coolify
- [ ] Create/verify Coolify app from repo
- [ ] Attach PostgreSQL + Redis services and env vars
- [ ] Configure S3-compatible storage env vars
- [ ] Configure migration execution on deploy
- [ ] Deploy and verify health endpoint + core flows

### Human checkpoint F (required)
- [ ] You approve production go-live after smoke test passes

## 6) Final Wrap
- [ ] Record deferred v2 scope explicitly (excluding Redis/barcode/uploads now in v1)
- [ ] Save final architecture note and deployment runbook
- [ ] Tag MVP release (`v0.1.0` suggested)
