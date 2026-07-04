# AuditHub

Practice management platform for Chartered Accountants, Auditors, and Tax Consultants.

## Stack

- **Web:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · TanStack Query · Recharts
- **API:** Node.js · Express · TypeScript · Zod · node-cron
- **DB:** PostgreSQL 16 · Prisma ORM
- **Monorepo:** pnpm workspaces

## Layout

```
audithub/
├─ apps/
│  ├─ web/   # Next.js frontend (port 3000)
│  └─ api/   # Express backend (port 4000)
└─ packages/
   ├─ types/   # shared TS + Zod schemas
   └─ config/  # eslint & tsconfig presets
```

## Getting started

```bash
pnpm install

# API
cp apps/api/.env.example apps/api/.env         # fill DATABASE_URL, JWT secrets
pnpm --filter @audithub/api prisma:generate
pnpm --filter @audithub/api prisma:migrate     # runs prisma migrate dev
pnpm --filter @audithub/api db:seed            # creates demo org + admin

# Web
cp apps/web/.env.example apps/web/.env

# Dev (both apps)
pnpm dev
```

Default seeded login: `admin@audithub.local` / `admin@1234`.

## Status

This is a skeleton scaffold. Modules are wired but most business logic is stubbed with `TODO`. See `AuditHub.md` for the full design reference.
