import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_INFO,
  MODEL_PROVIDERS,
  type ModelProvider,
  parseModelProvider,
  PROVIDER_SETTINGS,
} from '@agentcores/agent-core';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BACKEND_PORT, POSTGRES_PORT, REDIS_PORT } from './paths';

/** The first `.env`. The backend reads it from the home folder, because the CLI starts the backend there. */
export function defaultEnv(): string {
  return `# AgentCores.AI settings, written by \`agentcores init\`. You can edit this file.
# The backend reads it each time \`agentcores up\` starts it.

PORT=${BACKEND_PORT}
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${randomBytes(12).toString('base64url')}

DATABASE_URL=postgres://agentcores:agentcores@localhost:${POSTGRES_PORT}/agentcores
REDIS_HOST=localhost
REDIS_PORT=${REDIS_PORT}

# Set the key of each provider you pick below.
${MODEL_PROVIDERS.map((name) => `${MODEL_PROVIDER_INFO[name].apiKeyEnv}=`).join('\n')}

# ${MODEL_PROVIDERS.join(' or ')}. Leave a *_MODEL_ID empty for the provider's default model.
${PROVIDER_SETTINGS.map((key) => `${key}=${DEFAULT_MODEL_PROVIDER}`).join('\n')}
REASONING_STRATEGY_MODEL_ID=
REASONING_JOB_MODEL_ID=
REASONING_TASK_MODEL_ID=
EXECUTION_MODEL_ID=

SCREENSHOT_MAX_WIDTH=1280
SCREENSHOT_MAX_HEIGHT=800

# Needed for the backend to start. Keep as is.
HE_MEMORY_URL=http://localhost:3077/api
HE_MEMORY_API_KEY=
`;
}

export function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

/** Sets each key in place, and adds the keys the text does not have yet. Comments and order stay. */
export function setEnvValues(text: string, values: Readonly<Record<string, string>>): string {
  const pending = new Map(Object.entries(values));
  const lines = text.split('\n').map((line) => {
    const key = /^([A-Z0-9_]+)=/.exec(line)?.[1];
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key)!;
    pending.delete(key);
    return `${key}=${value}`;
  });
  const added = [...pending].map(([key, value]) => `${key}=${value}`);
  if (added.length === 0) return lines.join('\n');
  const body = lines.join('\n').replace(/\n*$/, '\n');
  return `${body}${added.join('\n')}\n`;
}

/** The providers that `.env` uses, so the CLI asks only for the keys it needs. */
export function providersInUse(values: ReadonlyMap<string, string>): ModelProvider[] {
  return [...new Set(PROVIDER_SETTINGS.map((key) => parseModelProvider(key, values.get(key))))];
}

export function missingKeys(values: ReadonlyMap<string, string>): string[] {
  return providersInUse(values)
    .map((provider) => MODEL_PROVIDER_INFO[provider].apiKeyEnv)
    .filter((key) => !values.get(key));
}

export function useProviderEverywhere(provider: ModelProvider): Record<string, string> {
  return Object.fromEntries(PROVIDER_SETTINGS.map((key) => [key, provider]));
}

export class EnvFile {
  constructor(private readonly path: string) {}

  exists(): boolean {
    return existsSync(this.path);
  }

  createIfMissing(): boolean {
    if (this.exists()) return false;
    writeFileSync(this.path, defaultEnv(), { mode: 0o600 });
    return true;
  }

  read(): Map<string, string> {
    return parseEnv(readFileSync(this.path, 'utf8'));
  }

  set(values: Readonly<Record<string, string>>): void {
    writeFileSync(this.path, setEnvValues(readFileSync(this.path, 'utf8'), values), { mode: 0o600 });
  }
}
