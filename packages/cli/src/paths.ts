import { homedir } from 'node:os';
import { join } from 'node:path';

/** Where the CLI keeps the user's settings, data, and logs. `AGENTCORES_HOME` moves it, for example for a test. */
export const HOME = process.env.AGENTCORES_HOME ?? join(homedir(), '.agentcores');

export const HOME_FILES = {
  env: join(HOME, '.env'),
  compose: join(HOME, 'compose.yaml'),
  pid: join(HOME, 'backend.pid'),
  log: join(HOME, 'backend.log'),
} as const;

/** The files the build puts next to `cli.js` in `dist/`. */
export const BUNDLE_FILES = {
  compose: join(__dirname, 'compose.yaml'),
  backend: join(__dirname, 'backend.js'),
  migrate: join(__dirname, 'migrate.js'),
  dashboard: join(__dirname, 'dashboard'),
} as const;

export const BACKEND_PORT = 3088;
export const POSTGRES_PORT = 5434;
export const REDIS_PORT = 6381;
export const DASHBOARD_URL = `http://localhost:${BACKEND_PORT}`;
