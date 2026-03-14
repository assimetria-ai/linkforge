# ─────────────────────────────────────────────────────────────────────────────
#  Assimetria Product Template — Root Dockerfile  (multi-stage, production-ready)
#
#  Produces a single image that:
#    1. Builds the React/Webpack frontend (dist/)
#    2. Bundles the Node.js/Express backend
#    3. Serves static assets from the backend
#
#  Typical usage
#    docker build -t product-template .
#    docker run -p 4000:4000 --env-file .env product-template
#
#  Build targets
#    --target server-deps   → only production server deps (CI cache layer)
#    --target client-build  → only Webpack build (CI cache layer)
#    --target runner        → final production image (default)
# ─────────────────────────────────────────────────────────────────────────────

# ── Shared base ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ARG CACHEBUST=1
RUN apk add --no-cache tini postgresql-client

# ── Stage 1: server production dependencies ───────────────────────────────────
FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: client build ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client

# Manifests first → better layer caching
COPY client/package*.json ./
RUN npm ci

COPY client/ ./

# Webpack production build (outputs to dist/)
ARG CACHEBUST_CLIENT=2
RUN npm run build \
 && echo "--- client build verification ---" \
 && ls -la dist/ \
 && ls dist/static/js/ | head -5 \
 && test -f dist/index.html || (echo "FATAL: dist/index.html missing after build" && exit 1)

# ── Stage 3: final runner ─────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Server production deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Server source
COPY server/src/ ./server/src/
COPY server/package*.json ./server/

# Built frontend assets (served by Express as static files or a CDN)
# Server looks for static files at server/src/../public = server/public
COPY --from=client-build /app/client/dist ./server/public

# Verify static assets are present in final image
RUN test -f server/public/index.html || (echo "FATAL: server/public/index.html missing" && exit 1) \
 && test -d server/public/static/js || (echo "FATAL: server/public/static/js missing" && exit 1) \
 && echo "Static assets verified: $(ls server/public/static/js/*.js | wc -l) JS files"

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/server/public

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/src/db/migrations/@system/start.js"]
