# ── Stage 1: Build the Vite app ───────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ── Stage 2: Serve with nginx + proxy to bun-ehr ──────────────────────────────
# nginx serves the static files and proxies /v1, /api, /ws to the backend.
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ | grep -q "Meblock" || exit 1

CMD ["nginx", "-g", "daemon off;"]
