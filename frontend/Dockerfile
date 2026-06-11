# BunEHR Frontend — Vite build served by nginx with API/WebSocket proxy

# ── Stage 1: build static assets ──────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Empty string = same-origin requests through nginx proxy
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY public ./public

RUN bun run build

# ── Stage 2: nginx static server + reverse proxy ──────────────────────────────
FROM nginx:1.27-alpine AS runner

LABEL org.opencontainers.image.title="BunEHR Frontend" \
      org.opencontainers.image.source="https://github.com/franselstadt/BunEHR"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ | grep -q "BunEHR" || exit 1

CMD ["nginx", "-g", "daemon off;"]
