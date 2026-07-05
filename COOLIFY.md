# Deploying AuditHub on Coolify (with a Hostinger subdomain)

You'll create **one Coolify project** with **three resources** — a Postgres database, the
API, and the web app — each on its own subdomain, with automatic HTTPS.

Assume your domain is `digitalvetri.com`. We'll use:

| Resource | Subdomain | Container port |
| --- | --- | --- |
| Web (Next.js) | `audithub.digitalvetri.com` | 3000 |
| API (Express) | `api.audithub.digitalvetri.com` | 4000 |
| Postgres | (internal only, no domain) | 5432 |

> Swap in whatever subdomains you like — just keep them consistent in the env vars below.

---

## 0 — Prerequisites

- Coolify already installed and running on your server (you have this).
- The server has a **public IPv4** — note it, e.g. `203.0.113.45`.
- This repo pushed to GitHub/GitLab (Coolify deploys from git).

```bash
git add .
git commit -m "Add web Dockerfile + standalone output for Coolify"
git push
```

---

## 1 — Point DNS at Coolify (Hostinger)

Hostinger → **Domains → digitalvetri.com → DNS / Nameservers → Manage DNS records**.

Add two **A records** pointing at your Coolify server IP:

| Type | Name | Points to | TTL |
| --- | --- | --- | --- |
| A | `audithub` | `203.0.113.45` | 300 |
| A | `api.audithub` | `203.0.113.45` | 300 |

Save. DNS usually propagates in a few minutes (up to an hour). Check with
`dig audithub.digitalvetri.com +short` — it should return your IP.

> Coolify (via Traefik) issues Let's Encrypt TLS automatically once DNS resolves, so
> both subdomains get HTTPS with no extra steps.

---

## 2 — Create the project + database

1. Coolify → **Projects → + New** → name it `AuditHub` → open the **Production** env.
2. **+ New Resource → Databases → PostgreSQL** (v16).
3. Create it. Open it and copy the **internal connection URL** — it looks like:
   ```
   postgresql://postgres:SOMEPASSWORD@<internal-host>:5432/postgres
   ```
   You'll paste this into the API as `DATABASE_URL`. (Use the *internal* URL so DB
   traffic never leaves the server.)
4. Make sure the database is **started**.

---

## 3 — Deploy the API

**+ New Resource → Application → your repo → branch `main`.**

**Build settings:**
- Build Pack: **Dockerfile**
- Base Directory: `/`
- Dockerfile Location: `/apps/api/Dockerfile`
- Port (exposed): `4000`

**Domain:** `https://api.audithub.digitalvetri.com`

**Health check:** path `/health`, port `4000`.

**Environment variables** (Settings → Environment Variables). Paste these — generate your
OWN secrets, don't reuse any you've seen:

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:SOMEPASSWORD@<internal-host>:5432/postgres
JWT_ACCESS_SECRET=<64-char hex — run: openssl rand -hex 32>
JWT_REFRESH_SECRET=<64-char hex — different value>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=https://audithub.digitalvetri.com
APP_URL=https://audithub.digitalvetri.com
PLATFORM_ADMIN_EMAIL=info@digitalvetri.com
PLATFORM_ADMIN_PASSWORD=<a strong password you choose — NOT the repo default>
PLATFORM_ADMIN_NAME=Digital Vetri Admin
```

> The API **refuses to boot in production** if the JWT secrets are weak (<32 chars),
> if `PLATFORM_ADMIN_PASSWORD` is still the committed default, or if `APP_URL` contains
> `localhost`. That's intentional — it stops an insecure launch.

**Deploy.** On boot the container runs `prisma migrate deploy` (creates all tables from
the committed `init` migration) and then bootstraps your platform-admin account, so the
DB is ready with no manual step. When it's healthy, visit
`https://api.audithub.digitalvetri.com/health` → you should see `{"ok":true,...}`.

### Optional but recommended for the API

- **Persistent uploads:** documents are written to `./uploads` inside the container and
  are **wiped on every redeploy** unless you either (a) add a Coolify **Persistent
  Storage** volume mounted at `/app/uploads`, or (b) set the S3 vars (`S3_BUCKET`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION`) to use
  Cloudflare R2 / Wasabi / S3. S3 is the better choice.
- **Real email:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  (e.g. a Hostinger mailbox, Resend, or Postmark) so password-reset / invoice / reminder
  emails actually send. Without SMTP the app runs fine but logs emails instead of sending.

---

## 4 — Deploy the web app

**+ New Resource → Application → same repo → branch `main`.**

**Build settings:**
- Build Pack: **Dockerfile**
- Base Directory: `/`
- Dockerfile Location: `/apps/web/Dockerfile`
- Port (exposed): `3000`

**Domain:** `https://audithub.digitalvetri.com`

**Environment variable — must be a BUILD variable:**

```
NEXT_PUBLIC_API_URL=https://api.audithub.digitalvetri.com/api/v1
```

> This is baked into the browser bundle at **build time**, so in Coolify tick
> **"Build Variable / available at build time"** for it (Coolify passes it to the
> Dockerfile `ARG`). If you set it as a runtime-only var, the app will wrongly call
> `http://localhost:4000` and every request will fail. Note the URL ends in `/api/v1`.

**Deploy.** When healthy, open `https://audithub.digitalvetri.com` → you should see the
login page over HTTPS.

---

## 5 — First login

- Go to `https://audithub.digitalvetri.com/login`
- Sign in as the platform admin: `info@digitalvetri.com` + the `PLATFORM_ADMIN_PASSWORD`
  you set in step 3.
- New firms that self-register at `/signup` land as **pending** — approve them from the
  **Admin** panel (visible to the platform admin).

---

## 6 — If you ever change a subdomain

Three values must stay in sync, then redeploy **both** apps:
- API `CORS_ORIGIN` and `APP_URL` → the web URL
- Web `NEXT_PUBLIC_API_URL` → the API URL + `/api/v1`

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Web loads but every action fails / CORS errors | `NEXT_PUBLIC_API_URL` wrong or not a **build** var (rebuild web); `CORS_ORIGIN` on the API must exactly equal the web origin (no trailing slash). |
| API container crash-loops on boot | Read logs — usually the prod guard: weak JWT secret, default admin password, or `localhost` in `APP_URL`. |
| `/health` 502 in Coolify | Wrong exposed port (must be 4000) or DB not reachable — check `DATABASE_URL` uses the **internal** host. |
| TLS not issued | DNS not resolving to the server yet — `dig <subdomain> +short` must return your IP before Coolify can get a cert. |
| Uploaded documents vanish after redeploy | Expected without persistent storage — add the `/app/uploads` volume or switch to S3. |
| Emails never arrive | `SMTP_*` not set — the console mailer only logs. |

---

## What was added / fixed in the repo to make container deploys work

- **`apps/web/Dockerfile`** (new) — multi-stage build producing a lean Next.js
  **standalone** image; `output: "standalone"` added to `apps/web/next.config.ts`.
- **`packages/types`** now builds to JS (`dist`) and its `package.json` points there.
  Previously it exported raw `.ts`, so the compiled API crashed at boot with
  `Unknown file extension ".ts"`. Both Dockerfiles now build it before the app.
- **`apps/api/Dockerfile`** fixed three things that broke the image build/boot:
  - `pnpm deploy --legacy` → `--prod` (the pinned pnpm 9.0.0 has no `--legacy`).
  - Moved the `prisma` CLI into `dependencies` and boot with the **local** pinned
    Prisma (not `npx prisma`, which pulled an incompatible Prisma 7 at runtime).
  - Installed `openssl`/`libc6-compat` (Prisma's engines need OpenSSL, missing on
    `node:20-alpine` → `Error loading shared library libssl`).

All of the above were **verified locally end-to-end**: `docker build` for both
images, the API run against a fresh Postgres (migration applied, platform admin
bootstrapped, login + authenticated `/clients` and `/dashboard` returned 200), and
the web container serving `/login` with the API URL correctly baked in.
