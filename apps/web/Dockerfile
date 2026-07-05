# AuditHub web (Next.js 15) — build context is the REPO ROOT.
# In Coolify set: Base Directory = /  and  Dockerfile Location = /apps/web/Dockerfile
#
# ─── build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Enable Corepack so pnpm matches the version pinned in package.json.
RUN corepack enable

# Copy manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

# --ignore-scripts: skip the types package's `prepare` build during the
# manifests-only install (no source yet); we build it explicitly below.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Now copy the rest of the sources.
COPY packages ./packages
COPY apps/web ./apps/web

# NEXT_PUBLIC_* vars are baked into the client bundle at BUILD time, so the API
# URL must be supplied as a build arg (in Coolify: mark NEXT_PUBLIC_API_URL as a
# "Build Variable"). Without it the app would call http://localhost:4000.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build the shared types package to JS before the Next build consumes it.
RUN pnpm --filter @audithub/types build
RUN pnpm --filter @audithub/web build

# ─── runtime stage ───────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js "standalone" output. In a monorepo the traced server + its minimal
# node_modules live under .next/standalone (rooted at the workspace), with the
# entrypoint at apps/web/server.js. Static assets and public/ are copied in
# alongside it (standalone does not include them).
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
