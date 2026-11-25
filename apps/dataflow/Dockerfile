FROM oven/bun:latest
WORKDIR /app

# The root prepare script installs git hooks, and the image has no git checkout.
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

CMD ["bun", "apps/dataflow/src/populate.ts"]
