import { copyFileSync, mkdirSync } from 'node:fs';
import { EnvFile } from './env-file';
import { BUNDLE_FILES, HOME, HOME_FILES } from './paths';
import { lastLines, run } from './shell';
import { CliError, command } from './ui';

const MIN_NODE_MAJOR = 22;

export function ensureMac(): void {
  if (process.platform !== 'darwin') {
    throw new CliError('AgentCores.AI runs on macOS only', [
      'It controls the screen, the mouse, and the keyboard of a real Mac.',
    ]);
  }
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE_MAJOR) {
    throw new CliError(`AgentCores.AI needs Node.js ${MIN_NODE_MAJOR} or newer`, [
      `This Mac has Node.js ${process.versions.node}.`,
      '',
      '1. Install Node.js 22 from https://nodejs.org.',
      '2. Run the command again.',
    ]);
  }
}

/** Creates the home folder, and writes the compose file of this CLI version. */
export function prepareHome(): EnvFile {
  mkdirSync(HOME, { recursive: true, mode: 0o700 });
  copyFileSync(BUNDLE_FILES.compose, HOME_FILES.compose);
  return new EnvFile(HOME_FILES.env);
}

export async function migrate(env: EnvFile): Promise<void> {
  const databaseUrl = env.read().get('DATABASE_URL');
  const result = await run(process.execPath, [BUNDLE_FILES.migrate], { ...process.env, DATABASE_URL: databaseUrl });
  if (!result.ok) {
    throw new CliError('The database migrations failed', [
      ...lastLines(result.output),
      '',
      `Check that Postgres runs with ${command('npx agentcores status')}, then try again.`,
    ]);
  }
}
