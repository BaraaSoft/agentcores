#!/usr/bin/env bash
# Wipes the local dev run state so the next run starts fresh: every BullMQ queue, and every table
# except the Strategies (and the migrations record). Each Strategy is set back to `active`.
# Works only through the docker-compose-dev containers, so it can never touch a remote database.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose-dev.yml)
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || true)
PORT=${PORT:-3088}
KEEP_TABLES="'strategies', 'migrations'"

if curl -s -o /dev/null --max-time 2 "http://localhost:${PORT}"; then
  echo "The backend is running on port ${PORT}. Stop 'pnpm dev' first, so no worker writes during the wipe." >&2
  exit 1
fi

echo "Emptying the queues (Redis)..."
"${COMPOSE[@]}" exec -T redis redis-cli FLUSHDB >/dev/null

echo "Emptying every table except ${KEEP_TABLES}..."
"${COMPOSE[@]}" exec -T postgres psql -U ahe -d ahe -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$
DECLARE
  tables text;
BEGIN
  SELECT string_agg(format('%I', table_name), ', ') INTO tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT IN (${KEEP_TABLES});
  IF tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE ' || tables || ' RESTART IDENTITY';
  END IF;
END
\$\$;
UPDATE strategies SET status = 'active', "endDate" = NULL, evaluation = NULL;
SQL

STRATEGIES=$("${COMPOSE[@]}" exec -T postgres psql -U ahe -d ahe -Atc 'SELECT count(*) FROM strategies')
echo "Done. Kept ${STRATEGIES} Strategies, all set to active. Create a Workflow for one, then start it."
