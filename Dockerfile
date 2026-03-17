# ─────────────────────────────────────────────────────────────────────────────
#  Assimetria Product — Dockerfile (nginx + Express dual-server, Vite build)
#  Stage 1 (client-build): Vite frontend → client/dist/
#  Stage 2 (server-deps):  Node.js production dependencies
#  Stage 3 (runner):       nginx + Node.js + tini
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: client build ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

# ── Stage 2: server production dependencies ───────────────────────────────────
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 3: final runner ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache tini nginx postgresql-client

WORKDIR /app

# Server production deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Server source
COPY server/src/ ./server/src/
COPY server/package*.json ./server/

# Built frontend assets → nginx serves from here
COPY --from=client-build /app/client/dist /usr/share/nginx/html

# Landing page
COPY landing.html /usr/share/nginx/html/landing.html

# nginx config
RUN rm -f /etc/nginx/http.d/default.conf 2>/dev/null || true
COPY nginx.production.conf /etc/nginx/http.d/default.conf

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 80

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/start.sh"]
