# Dependencies for the dev migrations service. The source is bind-mounted by docker-compose-dev.yml,
# so the service always sees the current entities and writes new migration files into the repo.
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

COPY packages/agent-core/tsconfig.json packages/agent-core/
COPY packages/migrations/tsconfig.json packages/migrations/
