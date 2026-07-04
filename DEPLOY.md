# Deploying AuditHub

Public SaaS deploy in ~15 minutes on three free tiers:

| Piece    | Where             | Free tier                              |
| -------- | ----------------- | -------------------------------------- |
| Database | **Neon**          | 0.5 GB storage, autoscales             |
| API      | **Render**        | 750 hrs/month (sleeps after 15 min idle) |
| Web      | **Vercel**        | Unlimited hobby projects               |

You'll end up with public URLs like `https://audithub.vercel.app` and `https://audithub-api.onrender.com`. Anyone in the world can visit the web URL and sign up.

## 1 — Push the repo to GitHub

```bash
git init
git add .
git commit -m "AuditHub v1"
gh repo create audithub --public --source=. --remote=origin --push
```

## 2 — Create the Postgres (Neon)

1. Sign in at <https://neon.tech>.
2. Create a project → pick a region close to your users (e.g. AWS Mumbai for India).
3. Copy the **Pooled connection** string. It looks like:
   ```
   postgresql://user:pass@ep-cool-forest-xxxxx-pooler.ap-south-1.aws.neon.tech/audithub?sslmode=require
   ```
4. Save it — you'll paste it into Render in step 3.

## 3 — Deploy the API (Render)

1. Sign in at <https://render.com> with GitHub.
2. **New → Blueprint** → pick your `audithub` repo. Render detects `render.yaml`.
3. When it prompts for env vars, paste:
   - `DATABASE_URL` = your Neon URL from step 2
   - `CORS_ORIGIN` = leave blank for now (fill in after step 4)
   - Render auto-generates strong values for the two JWT secrets — leave those alone.
4. Click **Create**. Render builds the Docker image, runs `prisma migrate deploy`, and starts the API.
5. Note the URL (e.g. `https://audithub-api.onrender.com`) and hit `/health` to confirm.

> Free-tier Render sleeps after 15 min. First request after sleep takes ~30s to wake. Upgrade to $7/month for always-on.

## 4 — Deploy the web (Vercel)

1. Sign in at <https://vercel.com> with GitHub.
2. **Add new → Project** → pick `audithub`.
3. Set the **Root Directory** to `apps/web` (Vercel picks up `vercel.json` for the build command).
4. Under **Environment Variables** add:
   - `NEXT_PUBLIC_API_URL` = `https://audithub-api.onrender.com/api/v1` (from step 3)
5. Click **Deploy**. Vercel builds and gives you a URL like `https://audithub.vercel.app`.

## 5 — Wire CORS

1. Copy your Vercel URL.
2. Go back to Render → your API service → **Environment**.
3. Set `CORS_ORIGIN` to your Vercel URL. Multiple URLs are OK — comma-separate:
   ```
   https://audithub.vercel.app,https://your-custom-domain.com
   ```
4. **Save & Deploy**. The API restarts and now accepts requests from your web app.

## 6 — Try it

- Visit your Vercel URL
- Click **Start free**
- Fill in your firm name, name, email, password → you're in

## Custom domain (optional)

- **Web** — Vercel → Project → Domains → add `app.yourfirm.in`. DNS: `CNAME` to `cname.vercel-dns.com`.
- **API** — Render → Service → Settings → Custom Domain → add `api.yourfirm.in`. DNS: `CNAME` to your Render URL.
- Update `NEXT_PUBLIC_API_URL` and `CORS_ORIGIN` env vars to the new domains, redeploy both.

## Production checklist

Before you send this URL to real customers:

- [ ] **Real SMTP** — the mailer is still `ConsoleMailer`. Swap in nodemailer with a Resend/Postmark/AWS SES account so signup / invoice / digest emails actually send. Edit `apps/api/src/lib/mailer.ts`.
- [ ] **Real object storage** — `LocalStorage` writes to `./uploads` on the container's ephemeral disk. Every deploy/restart wipes uploaded documents. Swap in Cloudinary or S3 in `apps/api/src/lib/storage.ts`.
- [ ] **Backups** — Neon has point-in-time restore; enable & test it. Also set up a nightly `pg_dump` to S3 for extra safety.
- [ ] **Custom domain with HTTPS** — Vercel and Render both handle Let's Encrypt automatically once DNS points to them.
- [ ] **Rate-limit tuning** — auth endpoints are 10/min per IP; blanket API is 300/min per IP. Adjust if legit users hit them.
- [ ] **Legal** — add a simple Terms + Privacy page and link from `/signup`. AuditHub touches PAN/GSTIN/Aadhaar — you're a data fiduciary under India's DPDP Act.
- [ ] **Observability** — pipe pino logs into Better Stack / Logtail / Datadog. Enable Render's health check → Slack/email alerts.
- [ ] **Monitoring the daily digest cron** — Render free tier sleeps. The 08:00 IST cron only fires if there's traffic keeping the process warm; upgrade to Render Starter ($7/mo) or move the cron to a separate scheduled job (Render Cron Job) so it always runs.

## Alternate hosts

Prefer everything on Railway? Delete `render.yaml`, create a Railway project, point to the same Dockerfile, add a Postgres plugin. Same env vars. Web is still simplest on Vercel.

Prefer self-hosted? The `apps/api/Dockerfile` is standard multi-stage — deploys on any container platform (Fly.io, EKS, GKE, plain Docker). The web app can be built to a static bundle only if you disable dynamic auth routes (it's Next.js so you'd normally deploy to a Node platform).
