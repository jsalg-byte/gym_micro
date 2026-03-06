# Gym-Micro MVP TODO (With Human-in-Loop Checks)

## Current Status
- [x] Research consolidated
- [x] Plan rechecked and aligned
- [x] Execution checklist prepared
- [x] Implementation started

## Priority Queue

1. Lock v1 decisions
- [x] Confirm auth mode for v1 (chosen: credentials + OAuth)
 - [x] Confirm strict v1 scope includes Redis + barcode + uploads/object storage
- [x] Confirm Node version for local/Coolify parity (Node 22 LTS)
- Human check: your explicit "approved" before we scaffold

2. Bootstrap project
- [ ] Initialize Next.js 15 + Tailwind + TypeScript
- [ ] Add Drizzle + Postgres wiring
- [ ] Add migration scripts and baseline config
- Human check: review generated structure before data model work

3. Ship schema foundation
- [x] Add minimal tables and relationships
- [x] Generate/apply migration
- [ ] Validate basic read/write paths
- Human check: schema sign-off by you before auth + features

4. Implement auth baseline
- [ ] Add Auth.js config and auth routes
- [ ] Protect app/private API surfaces
- [ ] Verify login/logout/session behavior
- Human check: you test sign-in flow and approve UX

5. Add Redis + Barcode + Upload infrastructure
- [ ] Configure Redis integration and minimal cache/rate-limit utility
- [ ] Add barcode scanning path (camera + manual barcode entry fallback)
- [ ] Add S3-compatible uploads flow (presigned URL + metadata persistence)
- Human check: you validate barcode scan and upload in local environment

6. Build MVP flows
- [ ] Workout: exercises, routines, sessions, sets
- [ ] Nutrition: foods, meal logs, history
- [ ] Mobile-first UI pass for core pages
- Human check: you run all 3 core user journeys end to end

7. Deploy and validate
- [ ] Connect repo app in Coolify
- [ ] Attach PostgreSQL + Redis + storage environment vars
- [ ] Configure deploy-time migrations
- [ ] Smoke test in deployed environment
- Human check: go-live approval from you

## Definition of Wrapped Up
- [ ] Production deploy is live from Git on Coolify
- [ ] Core flows validated (workouts + meals + barcode + uploads)
- [ ] v2 backlog explicitly deferred and documented (excluding in-scope features)
