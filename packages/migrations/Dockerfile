# One-shot image that applies pending migrations to the main database, then exits.
# Build context is the repo root: data-source.ts loads the entity files from packages/backend/src.
FROM node:22-slim

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/agent-core/package.json packages/agent-core/
COPY packages/backend/package.json packages/backend/
COPY packages/execution/package.json packages/execution/
COPY packages/migrations/package.json packages/migrations/
# --ignore-scripts skips the native screen addons (robotjs, sharp); migrations never load them.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/agent-core packages/agent-core
COPY packages/backend/src packages/backend/src
COPY packages/migrations packages/migrations
RUN pnpm --filter @ahe/agent-core build

CMD ["pnpm", "migrate"]
