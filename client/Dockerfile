# ─────────────────────────────────────────────────────────────────────────────
#  Client — React/Vite  (multi-stage, production-ready)
#  Stage 1 (builder) → install deps, compile TypeScript, bundle with Vite
#  Stage 2 (runner)  → serve static assets via nginx
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests for layer caching
COPY package*.json ./

# Install ALL deps (including dev tools needed for the build)
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build-time env vars (can be overridden at build time)
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}

# Type-check + bundle
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite output
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: SPA routing (all unknown paths → index.html) + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
