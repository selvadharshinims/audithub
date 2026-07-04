# ─── build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Enable Corepack so pnpm is available at the version pinned in package.json.
RUN corepack enable

# Copy manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile

# Now copy the rest and build.
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @audithub/api exec prisma generate
RUN pnpm --filter @audithub/api build

# Prune to production deps only for the runtime image.
RUN pnpm --filter @audithub/api deploy --prod --legacy /out

# ─── runtime stage ───────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# The Prisma CLI is used at boot for `prisma migrate deploy`.
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
COPY --from=builder /out/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

# Run migrations then boot. If your host does migrations separately (e.g. as a
# release-command), replace this CMD with `node dist/server.js`.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
