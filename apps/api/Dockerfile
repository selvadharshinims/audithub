# ─── build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma's engines are dynamically linked against OpenSSL; node:20-alpine ships
# without it, so install it (+ libc6-compat) or the schema/query engines fail to
# load ("Error loading shared library libssl").
RUN apk add --no-cache openssl libc6-compat

# Enable Corepack so pnpm is available at the version pinned in package.json.
RUN corepack enable

# Copy manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

# --ignore-scripts: the manifests-only stage has no source yet, so skip the
# types package's `prepare` build (we run it explicitly below once sources exist).
RUN pnpm install --frozen-lockfile --ignore-scripts

# Now copy the rest and build.
COPY packages ./packages
COPY apps/api ./apps/api

# Build the shared types package to JS FIRST — the compiled API imports it at
# runtime and node can't execute its .ts source.
RUN pnpm --filter @audithub/types build
RUN pnpm --filter @audithub/api exec prisma generate
RUN pnpm --filter @audithub/api build

# Prune to production deps only for the runtime image. (pnpm 9.0.0's `deploy`
# already uses the legacy resolver; no --legacy flag exists on this version.)
RUN pnpm --filter @audithub/api deploy --prod /out

# ─── runtime stage ───────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Same OpenSSL requirement for the runtime image (migrate deploy + query engine).
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=4000

# The Prisma CLI is used at boot for `prisma migrate deploy`.
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
COPY --from=builder /out/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

# Run migrations then boot, using the LOCAL pinned Prisma CLI (now a prod dep) —
# not `npx prisma`, which would download an incompatible Prisma at boot. If your
# host runs migrations separately, replace this CMD with `node dist/server.js`.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
