# ─────────────────────────────────────────────────────────────────────────────
#  Linkforge — Root Dockerfile  (production-ready)
#
#  Uses pre-built client/dist to avoid webpack build errors on Railway.
#  The client/dist is built locally and committed to the repo.
#  TODO: Restore multi-stage client build once @system webpack errors are fixed.
# ─────────────────────────────────────────────────────────────────────────────

# ── Shared base ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ARG CACHEBUST=6
RUN apk add --no-cache tini postgresql-client

# ── Stage 1: server production dependencies ───────────────────────────────────
FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: final runner ─────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Server production deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Server source
COPY server/src/ ./server/src/
COPY server/package*.json ./server/

# Pre-built frontend assets (using committed client/dist to bypass webpack errors)
COPY client/dist ./server/public

# Favicon files
COPY client/public/favicon* ./server/public/
# Landing page — served as public homepage for unauthenticated visitors at /
COPY server/landing.html ./server/public/landing.html
# Logo files for landing page
COPY client/public/logo*.png ./server/public/

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/server/public

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/src/db/migrations/@system/start.js"]
