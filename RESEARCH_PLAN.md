# Gym-Micro MVP Architecture Research Plan

## Objective
Identify the simplest production-capable MVP architecture for Gym-Micro (mobile-first workout + meal logging) that deploys cleanly from Git in Coolify with low operational overhead.

## Inputs and Constraints
- Preferred stack: Next.js 15 App Router, Tailwind CSS, PostgreSQL, Drizzle ORM, Coolify
- Primary goals: fast shipping, maintainability, low complexity
- Avoid custom Docker unless Coolify requires it
- Avoid non-essential infrastructure for MVP

## Research Scope
Answer and validate:
1. Simplest MVP architecture on Coolify
2. Git-based deployment viability in Coolify without custom Docker
3. Minimum schema for users, exercises, routines, workout sessions, workout sets, foods, meal logs
4. MVP implementation approach for Redis, barcode scanning, photo uploads, and object storage
5. Simplest auth approach for MVP
6. Sensible App Router folder structure and backend boundaries
7. Key tradeoffs and risks

## Decision Criteria
- Lowest cognitive and operational complexity
- Works with Coolify defaults
- Supports production basics: auth, persistence, migrations, environment management
- Enables quick iteration without major rewrites

## Research Method

### Phase 1: Platform and Deployment Feasibility
- Verify Coolify support path for Next.js repo deployments (build/start commands, env vars, persistent services)
- Confirm whether default Nixpacks/Buildpack flow is enough
- Identify the minimal Postgres setup path in Coolify
- Output: deployment feasibility note and required configuration checklist

### Phase 2: Architecture Optioning (MVP-First)
- Compare 2-3 realistic options, biased toward one codebase:
  - Option A: Next.js monolith (UI + route handlers/server actions) + Postgres
  - Option B: Next.js + separate API service (expected to be higher complexity)
  - Option C: Next.js monolith + extra infra (Redis/storage) for future readiness
- Score by simplicity, deployment friction, maintainability, and MVP fit
- Output: recommended architecture with explicit rejection reasons for non-selected options

### Phase 3: Minimal Data Model
- Define required entities and relationships:
  - users
  - exercises
  - routines
  - workout_sessions
  - workout_sets
  - foods
  - meal_logs
- Produce minimal schema (columns, keys, indexes, constraints)
- Confirm model supports core MVP flows:
  - create routine
  - log workout sets
  - log meal items
  - retrieve user history
- Output: recommended minimal schema (Drizzle-oriented)

### Phase 4: Auth Approach Selection
- Evaluate simplest production-safe auth paths for Next.js App Router:
  - managed auth provider
  - Auth.js with email/password or OAuth
  - custom JWT/session implementation (likely reject)
- Select one based on setup effort, security posture, and operational burden
- Output: recommended auth approach + rationale + known limitations

### Phase 5: App Structure and Boundaries
- Propose App Router-aligned structure for:
  - route groups
  - API route handlers/server actions
  - domain modules
  - database layer (Drizzle schema, queries, migrations)
  - validation and shared types
- Define boundaries to prevent business logic from leaking into UI components
- Output: folder structure blueprint and boundary rules

### Phase 6: v2 Deferral and Risk Register
- Define minimal MVP scope for:
  - Redis usage boundaries
  - barcode scan workflows
  - upload and object storage integration
- Identify what still remains out of scope for v2 after these are included
- Capture main risks/tradeoffs (performance, auth lock-in, migration workflow, vendor coupling, third-party API reliability, storage costs)
- Output: scoped MVP feature boundaries + remaining v2 list + risk matrix + mitigation actions

## Validation Artifacts to Produce
- Architecture Decision Record (ADR-style summary)
- Minimal schema definition (tables + relationships + essential indexes)
- Coolify deployment runbook (repo-based path, env vars, build/start, DB wiring, migration step)
- In-scope feature implementation table (including Redis/barcode/uploads) with justification
- Dependency justification list (every non-essential dependency explained or removed)

## Expected Final Deliverable Format
1. Recommended MVP architecture
2. Recommended minimal schema
3. Deployment recommendation for Coolify
4. MVP implementation plan for Redis, barcode scanning, and uploads (+ remaining v2 deferrals)
5. Justification for every non-essential dependency retained

## Working Assumptions
- Single-region deployment is acceptable for MVP
- Moderate early traffic; no immediate need for caching tier
- Mobile-first UX is delivered through responsive web app (no native app requirement in MVP)

## Completion Criteria
- All seven research questions answered with clear recommendation and rationale
- Recommended approach demonstrably deployable on Coolify from Git
- Schema supports core workout + meal logging flows without speculative complexity
- Deferred features and risks are explicit, with concrete revisit triggers
