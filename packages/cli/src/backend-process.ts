import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { BACKEND_PORT, BUNDLE_FILES, HOME, HOME_FILES } from './paths';
import { lastLines } from './shell';
import { CliError, command } from './ui';

const READY_TIMEOUT_MS = 120_000;
const STOP_TIMEOUT_MS = 10_000;
const POLL_MS = 500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The backend's process ID, when it runs. A stale PID file is removed. */
export function runningPid(): number | null {
  if (!existsSync(HOME_FILES.pid)) return null;
  const pid = Number(readFileSync(HOME_FILES.pid, 'utf8').trim());
  if (Number.isInteger(pid) && pid > 0 && isAlive(pid)) return pid;
  rmSync(HOME_FILES.pid, { force: true });
  return null;
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

function logTail(): string[] {
  return existsSync(HOME_FILES.log) ? lastLines(readFileSync(HOME_FILES.log, 'utf8'), 12) : [];
}

/** Starts the backend in the background. It keeps running after the terminal closes, until `agentcores down`. */
export async function startBackend(): Promise<number> {
  if (await portInUse(BACKEND_PORT)) {
    throw new CliError(`Port ${BACKEND_PORT} is in use`, [
      `AgentCores.AI serves the dashboard and its API on port ${BACKEND_PORT}.`,
      'Another program already listens on it.',
      '',
      `1. Find it: ${command(`lsof -nP -iTCP:${BACKEND_PORT} -sTCP:LISTEN`)}`,
      '2. Stop that program.',
      `3. Run ${command('npx agentcores up')} again.`,
    ]);
  }
  const log = openSync(HOME_FILES.log, 'a');
  const child = spawn(process.execPath, [BUNDLE_FILES.backend], {
    cwd: HOME,
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, NODE_ENV: 'production', DASHBOARD_DIR: BUNDLE_FILES.dashboard, AGENTCORES_HOME: HOME },
  });
  closeSync(log);
  child.unref();
  if (!child.pid) throw new CliError('The backend did not start', ['Node.js could not start a new process.']);
  writeFileSync(HOME_FILES.pid, String(child.pid));
  return child.pid;
}

/** Waits until the dashboard answers. Stops with the end of the log when the backend exits first. */
export async function waitUntilReady(pid: number): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) {
      rmSync(HOME_FILES.pid, { force: true });
      throw new CliError('The backend stopped while it started', [
        `The end of ${HOME_FILES.log}:`,
        '',
        ...logTail(),
        '',
        `Fix the problem, then run ${command('npx agentcores up')} again.`,
      ]);
    }
    const ready = await fetch(`http://127.0.0.1:${BACKEND_PORT}/`).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) return;
    await sleep(POLL_MS);
  }
  throw new CliError('The backend did not answer in time', [
    `It still runs, but it did not answer on port ${BACKEND_PORT} after ${READY_TIMEOUT_MS / 1000} seconds.`,
    `See the log with ${command('npx agentcores logs')}, or stop it with ${command('npx agentcores down')}.`,
  ]);
}

/** Stops the backend and its child processes. Returns false when it did not run. */
export async function stopBackend(): Promise<boolean> {
  const pid = runningPid();
  if (pid === null) return false;
  const signal = (name: NodeJS.Signals): void => {
    try {
      process.kill(-pid, name);
    } catch {
      try {
        process.kill(pid, name);
      } catch {
        /* already gone */
      }
    }
  };
  signal('SIGTERM');
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (isAlive(pid) && Date.now() < deadline) await sleep(200);
  if (isAlive(pid)) signal('SIGKILL');
  rmSync(HOME_FILES.pid, { force: true });
  return true;
}
