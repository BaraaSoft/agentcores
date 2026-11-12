import { DEFAULT_MODEL_PROVIDER, MODEL_PROVIDER_INFO, MODEL_PROVIDERS, type ModelProvider } from '@agentcores/agent-core';
import * as p from '@clack/prompts';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import pc from 'picocolors';
import { runningPid, startBackend, stopBackend, waitUntilReady } from './backend-process';
import { composeDown, composeStatus, composeUp, ensureDocker } from './docker';
import { EnvFile, missingKeys, useProviderEverywhere } from './env-file';
import { BACKEND_PORT, DASHBOARD_URL, HOME, HOME_FILES } from './paths';
import { ensurePermissions, terminalName } from './permissions';
import { ensureMac, migrate, prepareHome } from './setup';
import { openUrl, succeeds } from './shell';
import { box, CliError, command, link } from './ui';

/** Runs one step behind a spinner. The spinner turns red when the step fails, and the error goes up. */
async function step<T>(label: string, done: string, work: () => Promise<T> | T): Promise<T> {
  const spin = p.spinner();
  spin.start(label);
  try {
    const result = await work();
    spin.stop(done);
    return result;
  } catch (error) {
    spin.error(label);
    throw error;
  }
}

function cancelled<T>(value: T | symbol): value is symbol {
  if (!p.isCancel(value)) return false;
  p.cancel('Stopped. Nothing else changed.');
  process.exit(130);
}

/** Asks for the API keys that `.env` needs and does not have yet. */
async function ensureApiKeys(env: EnvFile, created: boolean): Promise<void> {
  if (created) {
    const provider = await p.select<ModelProvider>({
      message: 'Which models should AgentCores.AI use?',
      options: MODEL_PROVIDERS.map((value) => {
        const { label, defaultModelIds } = MODEL_PROVIDER_INFO[value];
        const models = `${defaultModelIds.reasoning} plans, ${defaultModelIds.execution} works on the screen`;
        return { value, label, hint: value === DEFAULT_MODEL_PROVIDER ? `recommended: ${models}` : models };
      }),
    });
    if (cancelled(provider)) return;
    env.set(useProviderEverywhere(provider));
  }
  for (const key of missingKeys(env.read())) {
    if (!process.stdin.isTTY) {
      throw new CliError(`${key} is missing`, [`Set ${key} in ${HOME_FILES.env}, then run the command again.`]);
    }
    const value = await p.password({
      message: `Paste your ${key} (the input stays hidden)`,
      validate: (text) => (text?.trim() ? undefined : 'AgentCores.AI needs this key to run.'),
    });
    if (cancelled(value)) return;
    env.set({ [key]: value.trim() });
  }
}

export async function init(): Promise<void> {
  const retry = 'npx agentcores init';
  p.intro(pc.inverse(' AgentCores.AI setup '));
  ensureMac();
  ensureDocker(retry);
  p.log.success('macOS, Node.js, and Docker are ready.');

  const env = prepareHome();
  const created = env.createIfMissing();
  p.log.info(created ? `Created your settings in ${HOME_FILES.env}` : `Kept your settings in ${HOME_FILES.env}`);

  if (runningPid() !== null) await step('Stopping the running backend', 'Stopped the running backend', stopBackend);
  await step('Stopping the old containers', 'Stopped the old containers', composeDown);
  await step('Starting Postgres and Redis', 'Postgres and Redis are running', composeUp);
  await step('Applying the database migrations', 'The database is up to date', () => migrate(env));

  await ensureApiKeys(env, created);
  ensurePermissions({ prompt: true, retry });
  p.log.success(`${terminalName()} has Accessibility and Screen Recording.`);

  p.outro('Setup is done.');
  console.log(box('success', 'AgentCores.AI is ready', [`Start it with ${command('npx agentcores up')}`]));
}

export async function up(): Promise<void> {
  const retry = 'npx agentcores up';
  p.intro(pc.inverse(' AgentCores.AI '));
  ensureMac();
  const env = new EnvFile(HOME_FILES.env);
  if (!env.exists()) {
    throw new CliError('AgentCores.AI is not set up yet', [`Run ${command('npx agentcores init')} first.`]);
  }
  const missing = missingKeys(env.read());
  if (missing.length > 0) {
    throw new CliError(`${missing.join(' and ')} is missing`, [
      `Run ${command('npx agentcores init')}, or set it in ${HOME_FILES.env}.`,
    ]);
  }
  ensurePermissions({ prompt: false, retry });

  const pid = runningPid();
  if (pid !== null) {
    openUrl(DASHBOARD_URL);
    p.outro('It already runs.');
    console.log(runningBox(pid));
    return;
  }

  ensureDocker(retry);
  prepareHome();
  await step('Starting Postgres and Redis', 'Postgres and Redis are running', composeUp);
  await step('Checking the database', 'The database is up to date', () => migrate(env));
  const started = await step('Starting the backend', 'The backend is running', async () => {
    const newPid = await startBackend();
    await waitUntilReady(newPid);
    return newPid;
  });
  openUrl(DASHBOARD_URL);
  p.outro('Opened the dashboard in your browser.');
  console.log(runningBox(started));
}

/** The Mac's address on the local network, so a phone on the same Wi-Fi can open the dashboard. */
function networkUrl(): string | null {
  const address = Object.values(networkInterfaces())
    .flat()
    .find((entry) => entry?.family === 'IPv4' && !entry.internal);
  return address ? `http://${address.address}:${BACKEND_PORT}` : null;
}

function runningBox(pid: number): string {
  const phone = networkUrl();
  return box('success', 'AgentCores.AI is running', [
    `Dashboard   ${link(DASHBOARD_URL)}`,
    ...(phone ? [`On a phone  ${link(phone)}  (same Wi-Fi)`] : []),
    `Logs        ${command('npx agentcores logs')}`,
    `Stop        ${command('npx agentcores down')}`,
    '',
    pc.dim(`It runs in the background (process ${pid}), so you can close this terminal.`),
  ]);
}

export async function down(): Promise<void> {
  p.intro(pc.inverse(' AgentCores.AI '));
  const stopped = await step('Stopping the backend', 'The backend is stopped', stopBackend);
  if (!stopped) p.log.info('The backend was not running.');
  if (existsSync(HOME_FILES.compose) && succeeds('docker', ['info'])) {
    await step('Stopping Postgres and Redis', 'Postgres and Redis are stopped', composeDown);
  } else {
    p.log.info('Docker is not running, so there are no containers to stop.');
  }
  p.outro(`Stopped. Your data stays in ${HOME}.`);
}

export async function status(): Promise<void> {
  const pid = runningPid();
  console.log(pid === null ? `Backend    ${pc.dim('stopped')}` : `Backend    ${pc.green('running')} at ${link(DASHBOARD_URL)} (process ${pid})`);
  if (existsSync(HOME_FILES.compose) && succeeds('docker', ['info'])) {
    console.log(`\n${await composeStatus()}`);
  } else {
    console.log(`Docker     ${pc.dim('not running')}`);
  }
}

export function logs(): void {
  if (!existsSync(HOME_FILES.log)) {
    throw new CliError('There is no log yet', [`Start AgentCores.AI with ${command('npx agentcores up')} first.`]);
  }
  spawn('tail', ['-n', '100', '-f', HOME_FILES.log], { stdio: 'inherit' });
}