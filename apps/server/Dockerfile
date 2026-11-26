# Base image with Bun
FROM oven/bun:latest AS base
WORKDIR /app

# Build stage
FROM base AS builder
WORKDIR /app

# Copy everything
COPY . .

# Install deps from bun.lock. The root prepare script installs git hooks,
# and the image has no git checkout.
RUN bun install --frozen-lockfile --ignore-scripts

# Generate the OpenAPI spec
RUN cd apps/server && bun run tsoa && bun run openapi

# Build the server
RUN cd apps/server && bun run build

# Final runtime image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 server

# Pre-deploy runs drizzle-kit in this image, before the server process starts.
# Versions match the lockfile. Journal version 7 needs drizzle-kit 0.31.
RUN bun install drizzle-kit@0.31.11 drizzle-orm@0.45.4 pg@8.23.1

# Copy Swagger spec
COPY --from=builder --chown=server:nodejs \
  /app/apps/server/build/swagger.yaml \
  /app/apps/server/build/swagger.yaml

# Copy Swagger UI dist
# (which can be either in apps/node_modules or apps/server/node_modules)
# COPY --from=builder --chown=server:nodejs \
#   /app/apps/node_modules/swagger-ui-dist \
#   /app/apps/node_modules/swagger-ui-dist
COPY --from=builder --chown=server:nodejs \
  /app/apps/server/node_modules/swagger-ui-dist \
  /app/apps/server/node_modules/swagger-ui-dist

# Copy only what's needed to run the server
COPY --from=builder --chown=server:nodejs \
  /app/apps/server/dist \
  /app/apps/server/dist

# Paths match out and schema in the copied drizzle config.
COPY --from=builder --chown=server:nodejs \
  /app/packages/db/drizzle \
  /app/apps/server/drizzle
COPY --from=builder --chown=server:nodejs \
  /app/packages/db/drizzle.config.ts \
  /app/apps/server/drizzle.config.ts
COPY --from=builder --chown=server:nodejs \
  /app/packages/db/src/schema \
  /app/apps/server/src/schema

USER server

EXPOSE 3000
WORKDIR /app/apps/server
CMD ["bun", "dist/server.js"]
