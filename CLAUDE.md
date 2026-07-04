# AuditHub — CLAUDE.md

Practice-management platform for Indian Chartered Accountants, auditors, and tax consultants. Multi-tenant, single database, one org per firm.

Design reference: `AuditHub (1).md` at the repo root (aka `AuditHub.md`) — the original spec. Everything in that doc is either built or explicitly deferred (see [Deferred](#deferred) below).

## Stack

- **Web** — Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · TanStack Query · Recharts · lucide-react
- **API** — Node 20 · Express · TypeScript (NodeNext) · Zod · Prisma · node-cron · pino · pdfkit · exceljs · multer · bcryptjs · jsonwebtoken
- **DB** — PostgreSQL 16 via Prisma ORM
- **Monorepo** — pnpm workspaces, TS project references not used (each app has its own tsconfig)

## Layout

```
audithub/                            # this dir (root of the monorepo)
├─ apps/
│  ├─ web/                           # Next.js frontend, port 3000
│  │  ├─ app/
│  │  │  ├─ (auth)/                  # login, forgot, reset
│  │  │  ├─ (dashboard)/             # authenticated shell
│  │  │  │  ├─ layout.tsx            # sidebar + topbar
│  │  │  │  ├─ dashboard/            # KPIs + charts
│  │  │  │  ├─ clients/              # clients + nested companies + documents
│  │  │  │  ├─ invoices/             # CRUD + PDF + email
│  │  │  │  ├─ payments/             # record payments, auto-recompute invoice status
│  │  │  │  ├─ compliance/           # reminders (calendar + list) + send-now
│  │  │  │  ├─ tasks/                # kanban (native HTML5 drag)
│  │  │  │  ├─ expenses/
│  │  │  │  ├─ reports/              # revenue / outstanding / gst / client-perf
│  │  │  │  ├─ notifications/        # full page (bell in topbar too)
│  │  │  │  └─ settings/             # org, users, roles, services, audit-log, digest
│  │  │  ├─ layout.tsx               # <ThemeProvider>, inline pre-hydration script
│  │  │  └─ providers.tsx            # QueryClient + ThemeProvider wiring
│  │  ├─ components/
│  │  │  ├─ ui/                      # shadcn-style primitives (button, input, card, modal, …)
│  │  │  ├─ notifications-bell.tsx
│  │  │  ├─ command-palette*.tsx     # ⌘K search across clients/invoices/tasks/reminders
│  │  │  ├─ theme-provider.tsx       # exports `themePrescript` used in <head>
│  │  │  └─ theme-toggle.tsx
│  │  ├─ hooks/                      # one file per resource, TanStack Query wrappers
│  │  ├─ lib/
│  │  │  ├─ api.ts                   # { get, post, patch, delete }, ApiError with .status
│  │  │  ├─ format.ts                # formatINR, formatDate (en-IN)
│  │  │  └─ utils.ts                 # cn() = twMerge(clsx())
│  │  └─ types/                      # one file per resource, shape-only interfaces
│  └─ api/                           # Express backend, port 4000
│     ├─ prisma/
│     │  ├─ schema.prisma            # ~15 entities incl. ReminderDispatch
│     │  └─ seed.ts                  # creates demo org + admin@audithub.local / admin@1234
│     └─ src/
│        ├─ server.ts                # bootstrap + graceful shutdown + cron start
│        ├─ app.ts                   # express() with helmet/cors/rate-limit/pino-http
│        ├─ config/env.ts            # Zod-validated process.env
│        ├─ lib/
│        │  ├─ prisma.ts             # singleton client
│        │  ├─ logger.ts             # pino (+ pino-pretty in dev)
│        │  ├─ mailer.ts             # Mailer interface + ConsoleMailer stub (attachments supported)
│        │  ├─ storage.ts            # Storage interface + LocalStorage (writes to ./uploads)
│        │  └─ push.ts               # Push interface + ConsolePush stub
│        ├─ middleware/
│        │  ├─ auth.ts               # requireAuth → verifies JWT, sets req.auth
│        │  ├─ rbac.ts               # requireRole("super_admin", …) (super_admin bypasses all)
│        │  ├─ audit.ts              # unused-so-far helper for auto-writing activity_logs
│        │  └─ error.ts              # HttpError + Zod-aware handler
│        ├─ jobs/
│        │  ├─ index.ts              # cron schedules
│        │  ├─ reminders.ts          # hourly sweep + dispatchReminder + sendReminderNow
│        │  └─ digests.ts            # daily 08:00 digest + sendDigestForOrg (manual)
│        └─ modules/                 # one folder per domain
│           ├─ auth/                 # login/refresh/forgot/reset/change-password/me
│           ├─ dashboard/            # single GET returns KPIs, charts, upcoming, activity
│           ├─ clients/              # CRUD
│           ├─ companies/            # split: clientCompaniesRouter + companiesRouter
│           ├─ documents/            # split: clientDocumentsRouter + documentsRouter
│           ├─ invoices/             # CRUD + PDF + email attachment
│           ├─ payments/             # CRUD + recomputeInvoiceStatus service
│           ├─ expenses/             # CRUD + distinct-categories helper on list
│           ├─ tasks/                # CRUD, org-scope via client OR assignee OR both null
│           ├─ reminders/            # CRUD + send-now
│           ├─ reports/              # service.ts + xlsx.ts + pdf.ts exporters
│           ├─ services/             # per-org catalog (super_admin + auditor mutations)
│           ├─ notifications/        # list + unread-count + mark-read + read-all
│           ├─ settings/             # org, roles, activity-logs, send-digest-now
│           └─ users/                # CRUD (list open to org; mutations super_admin only)
├─ packages/
│  ├─ types/                         # @audithub/types
│  │  └─ src/{enums,schemas,index}.ts   # shared enums + Zod schemas + inferred types
│  └─ config/                        # eslint + tsconfig presets (currently light)
├─ pnpm-workspace.yaml
├─ tsconfig.base.json                # `declaration: true` — the API opts out (see gotcha)
├─ AuditHub (1).md                   # design spec
└─ CLAUDE.md                         # this file
```

## Commands

Run from the repo root unless noted.

```bash
# Install / bootstrap
pnpm install
pnpm --filter @audithub/api prisma:generate     # regenerate after schema.prisma changes

# Dev (both apps in parallel)
pnpm dev                                        # web on :3000, api on :4000

# Filter a single app
pnpm --filter @audithub/web dev
pnpm --filter @audithub/api dev
pnpm --filter @audithub/api db:seed
pnpm --filter @audithub/api prisma migrate dev  # create/apply migration

# Typecheck (do this after every change — both apps expected to pass clean)
pnpm --filter @audithub/web typecheck
pnpm --filter @audithub/api typecheck

# Build
pnpm build
```

## Environment

Both apps read `.env` from their own folder (not the root).

- `apps/api/.env` — copy from `.env.example`
  - `DATABASE_URL`, `JWT_ACCESS_SECRET` (≥16 chars), `JWT_REFRESH_SECRET`, `PORT`, `CORS_ORIGIN`
  - `UPLOAD_ROOT` (defaults to `./uploads` — for the LocalStorage adapter)
  - SMTP_* / CLOUDINARY_URL / VAPID_* env vars are declared but the stubs ignore them
- `apps/web/.env` — copy from `.env.example`
  - `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api/v1`)

Seeded login: `admin@audithub.local / admin@1234` (from `prisma/seed.ts`).

## Conventions

### API modules

Every module lives at `apps/api/src/modules/<name>/routes.ts` and exports a `Router`. Register it in `apps/api/src/modules/index.ts` — **easy to forget**. When adding a route that needs `.js` extension imports, remember NodeNext demands them (see gotcha below).

Pattern for a scoped mutation:
```ts
router.patch("/:id", async (req, res, next) => {
  try {
    const input = SomeUpdateSchema.parse(req.body);
    const existing = await prisma.foo.findFirst({
      where: { id: req.params.id, /* org-scope through relation */ },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "…");
    const updated = await prisma.foo.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) { next(err); }
});
```

Always org-scope via `req.auth.orgId` at the DB layer, not just in middleware. Never trust IDs in the path/body without the `findFirst({ where: { id, orgId } })` guard.

### Zod schemas

All input validation lives in `packages/types/src/schemas.ts`. Shared enums in `enums.ts`. `optionalTrimmed` and `optionalEmail` helpers at the top of the schemas file — reuse them.

For fields the API stores as `Date` or `Decimal`, use `z.coerce.date()` / `z.coerce.number()` so JSON strings from the browser round-trip. When exporting types, use `z.input<...>` when the schema has a `.transform()` or `.default()` and callers pass raw values; `z.infer<...>` otherwise. The Invoice schema's `InvoiceCreateInput` is `z.input`.

### Web hooks

`apps/web/hooks/use-*.ts` — one file per resource, all use TanStack Query. Naming: `use<Resource>s()` (list), `use<Resource>(id)` (detail), `useCreate<Resource>()`, `useUpdate<Resource>()`, `useDelete<Resource>()`. Mutations invalidate their list KEY and any related caches (payments invalidate invoices + dashboard; documents invalidate the client detail cache).

### Web pages

`apps/web/app/(dashboard)/<route>/page.tsx`, `"use client"` because they use hooks. Component co-location in `_components/` folders (leading underscore = private, Next won't route it). Modal edit pattern (see tasks, compliance, expenses): a discriminated union `{ kind: "closed" | "create" | "edit"; ... }` in state.

### UI

Only the small shadcn-style primitives in `components/ui/` — Button, Input, Textarea, Label, Badge, Card, Select, Modal. **No radix components are actually used yet** despite being in deps. Add them from shadcn only when you need something the primitives can't do.

Themes: `.dark` class on `<html>` via `ThemeProvider`. All colours come from CSS variables in `globals.css`. When adding a new coloured element use the tokens (`bg-card`, `text-muted-foreground`, `border-input`, `bg-primary`, …), not raw palette classes.

### Multi-tenancy

Every user belongs to exactly one org via `User.orgId`. Every business record is org-scoped via either `orgId` directly (organizations, users, clients, expenses, services, activity_logs) or via the client relation (companies, documents, invoices, payments, tasks, reminders).

The dashboard endpoint, reports, and digest cron always compute at the org level and use `Promise.all` for parallel queries.

## Gotchas learned during the build

1. **NodeNext requires `.js` extensions on relative imports** — the API's tsconfig uses `moduleResolution: NodeNext`. When importing from `packages/types`, the barrel `src/index.ts` re-exports must be `./enums.js` / `./schemas.js` even though the source files are `.ts`. Symptom if you forget: cascading "no exported member" errors across every module in the API.
2. **`declaration: true` in `tsconfig.base.json` breaks the API** because pnpm hoists `@types/express-serve-static-core` and TS can't name the inferred `Router` type portably (TS2742). The API's `tsconfig.json` sets `declaration: false` to opt out. If you add a new app that emits types (a library), inherit from base as-is; if it's an app, do the same override.
3. **Prisma client regen is required** after any `schema.prisma` change — `pnpm --filter @audithub/api prisma:generate`. Symptom: `.cgst` and other new fields showing as `unknown`.
4. **Two routers per nested resource** — for docs/companies we mount one router under `/clients` (for `/:id/documents` etc.) and a second under `/documents` (for top-level `/:id/download`). Trying to do both in one router mounted at `/clients` makes the top-level routes become `/clients/documents/...`.
5. **PDF stream vs. buffer** — pdfkit returns a `PDFDocument` that IS a Readable stream. The download route pipes it; the email attachment path uses `renderInvoicePdfToBuffer` which collects `data` events before `end()` fires. If you write a new PDF, expose both variants.
6. **`api.<method>` object, not a callable** — `apps/web/lib/api.ts` exports an object `{ get, post, patch, delete }`. Old call sites that use `api<T>(path, init)` are wrong and will fail typecheck.
7. **Type asserts through unknown** — when `data.rows` is typed as `unknown[]` (e.g., generic `ReportPayload`), a direct `as RevenueRow[]` cast is illegal; go through `as unknown as RevenueRow[]`.
8. **`next.config.ts` has `transpilePackages: ["@audithub/types"]`** — so the Next build can compile the workspace types package. Add any new workspace package to that list if the web app imports it.
9. **Register the router** — 3 times I forgot to add `apiRouter.use("/foo", fooRouter)` in `modules/index.ts` after creating the module. Typecheck won't catch it. Sanity-check by hitting the endpoint (or grep `modules/index.ts` for the mount).
10. **Reminder dispatch idempotency** — the `ReminderDispatch` table has `@@unique([reminderId, offset, channel])` — the hourly sweep skips already-recorded (id, offset, channel) triples. `sendReminderNow` uses offset `0` and can be called repeatedly for testing without conflict.

## Cron schedules

Started from `apps/api/src/jobs/index.ts` on server boot.

- `0 * * * *` — reminder sweep (every hour on the hour)
- `0 8 * * *` — daily digest email (08:00 IST-ish; timezone is whatever Node's `Date` sees)

Both have manual trigger endpoints for testing: `POST /reminders/:id/send-now` and `POST /settings/send-digest-now` (super_admin only).

## Adapters

Three interfaces in `apps/api/src/lib/`:
- **`Mailer.send(to, subject, html, options?)`** — currently `ConsoleMailer`. Attachments supported. Swap in a nodemailer/Resend transport by re-exporting a different implementation from `mailer.ts` — nothing else needs to change.
- **`Storage.save() / stream() / remove()`** — currently `LocalStorage` writing to `./uploads`. Cloudinary/Supabase can plug in behind the same interface.
- **`Push.send(userId, payload)`** — `ConsolePush` stub.

## Deferred

Not built and not blocking anything; intentionally out of scope so far:

- Real SMTP/Resend/nodemailer transport (adapter is ready)
- 2FA (TOTP) — architected but disabled in the login flow
- Payment gateway, WhatsApp/SMS reminder channels
- Backup & restore UI (Prisma migrations + `pg_dump` are the current answer)
- Client portal (external scoped read-only view)
- Multi-office (single org per firm today)
- Line-item invoices (currently one description + subtotal — enough for CA billing but not for e-commerce)

## When adding a new domain

1. Add `<Domain>CreateSchema` / `<Domain>UpdateSchema` in `packages/types/src/schemas.ts`
2. Create `apps/api/src/modules/<name>/routes.ts` with the router
3. Register it in `apps/api/src/modules/index.ts` (import + `apiRouter.use(...)`)
4. Regenerate Prisma client if the schema changed
5. `apps/web/types/<name>.ts` — shape-only interface
6. `apps/web/hooks/use-<name>.ts` — TanStack hooks
7. Page under `apps/web/app/(dashboard)/<route>/page.tsx`, forms in `_components/`
8. Add to sidebar if it's top-level (`apps/web/app/(dashboard)/layout.tsx`)
9. `pnpm --filter @audithub/web typecheck && pnpm --filter @audithub/api typecheck` — both must be clean
