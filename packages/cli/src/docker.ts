import { HOME_FILES, POSTGRES_PORT, REDIS_PORT } from './paths';
import { lastLines, run, succeeds } from './shell';
import { CliError, command, link } from './ui';

const PROJECT = 'agentcores';
const DOCKER_DOWNLOAD = 'https://www.docker.com/products/docker-desktop';

/** Stops with a clear box when Docker is missing or not running. */
export function ensureDocker(retry: string): void {
  if (!succeeds('docker', ['--version'])) {
    throw new CliError('AgentCores.AI needs Docker, and Docker is not installed', [
      'AgentCores.AI keeps its database and its queue in Docker.',
      '',
      `1. Install Docker Desktop: ${link(DOCKER_DOWNLOAD)}`,
      '2. Open Docker Desktop, and wait until it says "Engine running".',
      `3. Run ${command(retry)} again.`,
    ]);
  }
  if (!succeeds('docker', ['info'])) {
    throw new CliError('Docker is installed, but it is not running', [
      '1. Open Docker Desktop from your Applications folder.',
      '2. Wait until it says "Engine running".',
      `3. Run ${command(retry)} again.`,
    ]);
  }
  if (!succeeds('docker', ['compose', 'version'])) {
    throw new CliError('Docker Compose is missing', [
      'Docker Desktop includes Docker Compose. Your Docker install does not have it.',
      '',
      `1. Install or update Docker Desktop: ${link(DOCKER_DOWNLOAD)}`,
      `2. Run ${command(retry)} again.`,
    ]);
  }
}

async function compose(args: readonly string[]): Promise<{ ok: boolean; output: string }> {
  return run('docker', ['compose', '-f', HOME_FILES.compose, '-p', PROJECT, ...args]);
}

/** Starts Postgres and Redis, and waits until both pass their health checks. */
export async function composeUp(): Promise<void> {
  const result = await compose(['up', '-d', '--wait', 'postgres', 'redis']);
  if (result.ok) return;
  if (/port is already allocated|address already in use/i.test(result.output)) {
    throw new CliError('A port that AgentCores.AI needs is in use', [
      `Postgres uses port ${POSTGRES_PORT}, and Redis uses port ${REDIS_PORT}.`,
      'Another program or container already listens on one of them.',
      '',
      `1. Find it: ${command(`lsof -nP -iTCP:${POSTGRES_PORT} -iTCP:${REDIS_PORT} -sTCP:LISTEN`)}`,
      '2. Stop that program or container.',
      `3. Run the ${command('agentcores')} command again.`,
    ]);
  }
  throw new CliError('Docker could not start Postgres and Redis', ['Docker said:', '', ...lastLines(result.output)]);
}

/** Removes the containers. The data stays in the `data/` folder, because the volumes are never removed. */
export async function composeDown(): Promise<void> {
  const result = await compose(['down']);
  if (!result.ok) {
    throw new CliError('Docker could not stop Postgres and Redis', ['Docker said:', '', ...lastLines(result.output)]);
  }
}

export async function composeStatus(): Promise<string> {
  return (await compose(['ps', '--format', 'table {{.Service}}\t{{.State}}\t{{.Status}}'])).output.trimEnd();
}
