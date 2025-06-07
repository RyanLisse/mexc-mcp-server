# Multi-stage build for MEXC MCP Server using Encore.ts
FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* bunfig.toml* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

# Copy source code and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set placeholder environment variables for build
ENV MEXC_API_KEY=placeholder-for-build
ENV MEXC_SECRET_KEY=placeholder-for-build
ENV NODE_ENV=production

# Build the application (this generates encore.gen directory)
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 encore
RUN adduser --system --uid 1001 encore

# Copy the entire built application
COPY --from=builder --chown=encore:encore /app/encore.gen ./encore.gen
COPY --from=builder --chown=encore:encore /app/node_modules ./node_modules
COPY --from=builder --chown=encore:encore /app/package.json ./package.json
COPY --from=builder --chown=encore:encore /app/encore.app ./encore.app

# Copy service files that might be needed at runtime
COPY --from=builder --chown=encore:encore /app/shared ./shared
COPY --from=builder --chown=encore:encore /app/auth ./auth
COPY --from=builder --chown=encore:encore /app/market-data ./market-data
COPY --from=builder --chown=encore:encore /app/mcp ./mcp
COPY --from=builder --chown=encore:encore /app/health-observability ./health-observability
COPY --from=builder --chown=encore:encore /app/portfolio ./portfolio
COPY --from=builder --chown=encore:encore /app/trading ./trading
COPY --from=builder --chown=encore:encore /app/tools ./tools
COPY --from=builder --chown=encore:encore /app/ai ./ai
COPY --from=builder --chown=encore:encore /app/pattern-sniper ./pattern-sniper
COPY --from=builder --chown=encore:encore /app/transaction-history ./transaction-history

# Set user
USER encore

# Expose port
EXPOSE 3000

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV MEXC_BASE_URL=https://api.mexc.com
ENV MEXC_WEBSOCKET_URL=wss://wbs.mexc.com/ws
ENV LOG_LEVEL=info
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV RATE_LIMIT_WINDOW_MS=60000
ENV CACHE_TTL_TICKER=5000
ENV CACHE_TTL_ORDERBOOK=2000
ENV CACHE_TTL_STATS=10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application using the compiled entrypoint
CMD ["bun", "encore.gen/internal/entrypoints/combined/main.ts"]