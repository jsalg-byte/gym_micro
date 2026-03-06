# Gym-Micro MVP

Mobile-first workout + nutrition tracker using:
- Next.js 15 App Router
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- Auth.js (credentials + OAuth)
- Redis (rate-limit/cache)
- Routine-day based session tracking with preset workouts
- Barcode lookup connected to nutrition macros
- Progress photo uploads (S3-compatible presigned URLs)

## Local Setup

1. Install deps:
```bash
npm install
```

2. Copy env template:
```bash
cp .env.example .env.local
```

3. Generate and run migrations:
```bash
npm run db:generate
npm run db:setup
```

4. Start dev server:
```bash
npm run dev
```

## Useful Scripts

- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:create`
- `npm run db:migrate`
- `npm run db:setup`
- `npm run db:studio`

## Coolify Notes

- Deploy from Git using Nixpacks.
- Set `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, and S3 env vars.
- Run `npm run db:migrate` as post-deploy/release command.
