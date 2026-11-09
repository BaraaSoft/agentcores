#!/usr/bin/env bash
# One command from a fresh clone to a running AgentCores.AI: checks the Mac, Node, pnpm, and Docker, writes .env
# for Meta Muse, starts Postgres and Redis, applies the migrations, checks the screen permissions, and
# launches the backend and the dashboard. Safe to run again: each step skips the work already done.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f compose.yaml)
BOLD=$'\033[1m'
BLUE=$'\033[38;2;0;129;251m'
RED=$'\033[31m'
RESET=$'\033[0m'

step() { printf '\n%s==> %s%s\n' "${BLUE}${BOLD}" "$1" "${RESET}"; }
fail() { printf '\n%sError:%s %s\n' "${RED}${BOLD}" "${RESET}" "$1" >&2; exit 1; }

# Sets KEY=value in .env without sed escaping, so any character in the value is safe.
set_env() {
  KEY="$1" VALUE="$2" awk 'BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VALUE"] }
    $0 ~ "^" k "=" { print k "=" v; found = 1; next } { print }
    END { if (!found) print k "=" v }' .env > .env.tmp && mv .env.tmp .env
}

get_env() { grep -E "^$1=" .env | head -n 1 | cut -d= -f2- || true; }

step "Checking this machine"
[[ "$(uname -s)" == "Darwin" ]] || fail "AgentCores.AI controls a real Mac screen, so it runs on macOS only."
command -v node >/dev/null || fail "Node.js 22 is missing. Install it from https://nodejs.org, then run this again."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
(( NODE_MAJOR >= 22 )) || fail "AgentCores.AI needs Node.js 22 or newer. This Mac has $(node -v)."
command -v pnpm >/dev/null || fail "pnpm is missing. Run 'corepack enable', then run this again."
command -v docker >/dev/null || fail "Docker is missing. Install Docker Desktop from https://www.docker.com, then run this again."
docker info >/dev/null 2>&1 || fail "Docker is not running. Open Docker Desktop, wait until it is ready, then run this again."
echo "macOS, Node.js $(node -v), pnpm $(pnpm -v), and Docker are ready."

step "Installing the packages"
pnpm install --frozen-lockfile

step "Writing .env"
if [[ ! -f .env ]]; then
  cp .env.example .env
  for key in REASONING_STRATEGY_PROVIDER REASONING_JOB_PROVIDER REASONING_TASK_PROVIDER EXECUTION_PROVIDER; do
    set_env "$key" muse
  done
  echo "Created .env from .env.example, with Meta Muse on every layer."
else
  echo "Kept your .env. Its providers stay as they are."
fi

if [[ -z "$(get_env META_API_KEY)" ]] && grep -qE '^(REASONING_[A-Z]+|EXECUTION)_PROVIDER=muse' .env; then
  read -r -s -p "Paste your Meta API key (the input stays hidden): " META_KEY
  echo
  [[ -n "$META_KEY" ]] || fail "AgentCores.AI needs a Meta API key to run Muse. Run this again and paste the key."
  set_env META_API_KEY "$META_KEY"
  echo "Saved the key in .env."
else
  echo "The API key is already set."
fi

step "Starting Postgres and Redis"
"${COMPOSE[@]}" up -d --wait postgres redis

step "Applying the database migrations"
"${COMPOSE[@]}" up --build --exit-code-from migrations migrations

step "Checking the screen permissions"
pnpm build:libs
if ! pnpm --filter @agentcores/execution check:desktop; then
  fail "macOS has not given your terminal the screen yet. Open System Settings > Privacy & Security, allow
your terminal app in Accessibility and in Screen Recording, restart the terminal, then run 'pnpm quickstart' again."
fi

step "Launching AgentCores.AI"
echo "The dashboard opens at http://localhost:5173. Press Ctrl+C to stop. Postgres and Redis keep running;"
echo "stop them with 'pnpm compose:down'."
exec pnpm dev:start
