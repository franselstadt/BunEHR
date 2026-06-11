# BunEHR API — multi-stage production image
# Bun runs TypeScript natively; Drizzle migrations run on startup.

# ── Stage 1: production dependencies ──────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# ── Stage 2: production runner ───────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="BunEHR API" \
      org.opencontainers.image.source="https://github.com/franselstadt/BunEHR"

RUN addgroup -g 1001 -S bunehr \
 && adduser -S bunehr -u 1001 -G bunehr

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY drizzle.config.ts ./

ENV NODE_ENV=production
ENV PORT=3000

USER bunehr
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
