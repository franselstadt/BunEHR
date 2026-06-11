# ── Stage 1: Install dependencies ─────────────────────────────────────────────
# Use oven/bun:1.2-alpine for a minimal, fast image.
# Copy lockfile first so this layer is cached unless dependencies change.
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
# bun install respects bun.lock for reproducible builds
RUN bun install --frozen-lockfile

# ── Stage 2: Production runner ─────────────────────────────────────────────────
# Copy only what the app needs — no dev tooling, no frontend source.
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app

# Copy installed packages from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (backend only — frontend served separately or built)
COPY src/ ./src/
COPY drizzle.config.ts ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check — waits up to 20s for startup (migrations + server init)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Bun transpiles TypeScript natively — no build step needed.
# Drizzle migrations run automatically on startup before the first request.
CMD ["bun", "run", "src/index.ts"]
