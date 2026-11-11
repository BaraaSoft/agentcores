import { MODEL_PROVIDER_INFO, parseModelProvider, type ExecutionResult, type ExecutionTask } from '@agentcores/agent-core';
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExecutionProvider } from '../../create-execution-provider';
import type { ExecutionTurn } from '../types/execution-turn';
import { FixtureServer } from './fixtures/fixture-server';

/*
 * End-to-end tests on the real desktop: real screenshots, real mouse and keyboard, real model calls.
 * They take over the machine and cost API credits, so they only run through `pnpm test:e2e`
 * and are skipped without the provider's key. Run `pnpm check:desktop` once first for the macOS permissions.
 * `EXECUTION_PROVIDER=muse` runs the same tasks on Muse with META_API_KEY; Claude is the default.
 * The test never touches the desktop itself: every task starts wherever the last one left the screen,
 * and the model gets to each page on its own, as it would in production.
 */

config({ path: join(__dirname, '../../../../../.env'), quiet: true });

const PROVIDER = parseModelProvider('EXECUTION_PROVIDER', process.env.EXECUTION_PROVIDER);
const API_KEY = process.env[MODEL_PROVIDER_INFO[PROVIDER].apiKeyEnv] ?? '';
const MODEL_ID = process.env.EXECUTION_MODEL_ID || MODEL_PROVIDER_INFO[PROVIDER].defaultModelIds.execution;
const BROWSER = process.env.AGENTCORES_E2E_BROWSER ?? 'Safari';
const MAX_STEPS = 30;
const LOG_DIRECTORY = join(tmpdir(), 'ahe-e2e');

const describeOnDesktop = API_KEY === '' ? describe.skip : describe;

jest.setTimeout(5 * 60_000);

describeOnDesktop(`Computer use on the real desktop (${PROVIDER})`, () => {
  let server: FixtureServer;

  beforeAll(async () => {
    server = await FixtureServer.start();
    mkdirSync(LOG_DIRECTORY, { recursive: true });
    console.log(`Fixtures at ${server.url('/')} — step logs in ${LOG_DIRECTORY}`);
  });

  afterAll(async () => {
    await server.close();
  });

  /** Runs one task, writing every model turn and the result to `<LOG_DIRECTORY>/<name>.log`. */
  const runTask = async (name: string, task: Pick<ExecutionTask, 'instruction'> & Partial<ExecutionTask>): Promise<ExecutionResult> => {
    const lines: string[] = [];
    const onTurn = ({ turn, text, toolCalls }: ExecutionTurn): void => {
      lines.push(`--- turn ${turn}`, text, ...toolCalls.map((call) => `> ${call}`));
    };
    const provider = createExecutionProvider({ providerName: PROVIDER, apiKey: API_KEY, modelId: MODEL_ID, onTurn });
    try {
      const result = await provider.runTask({ taskId: name, context: '', maxSteps: MAX_STEPS, credentials: null, ...task });
      lines.push('--- result', JSON.stringify(result, null, 2));
      return result;
    } finally {
      writeFileSync(join(LOG_DIRECTORY, `${name}.log`), lines.join('\n'));
    }
  };

  it('opens a named browser and reads a heading', async () => {
    const result = await runTask('heading', {
      instruction: `Open ${BROWSER} and go to ${server.url('/heading')}. Report the number in the page heading.`,
    });

    expect(result.status).toBe('done');
    expect(result.summary).toContain(server.codes.heading);
  });

  it('scrolls to the end of a long page', async () => {
    const result = await runTask('scroll', {
      instruction: `Go to ${server.url('/scroll')} and report the code word written at the very end of the page.`,
    });

    expect(result.status).toBe('done');
    expect(result.summary).toContain(server.codes.scroll);
  });

  it('reads small print', async () => {
    const result = await runTask('zoom', {
      instruction: `Go to ${server.url('/zoom')} and report the small print reference number.`,
    });

    expect(result.status).toBe('done');
    expect(result.summary).toContain(server.codes.zoom);
  });

  it('types text with an accent and an emoji exactly', async () => {
    const message = 'Hello from AHE 🚀 café';
    const result = await runTask('echo', {
      instruction: `Go to ${server.url('/echo')}, type this exact message into the Message box, and click Send: ${message}`,
    });

    expect(result.status).toBe('done');
    expect(server.messages).toContain(message);
  });

  it('reports a human-verification gate as a blocker without passing it', async () => {
    const result = await runTask('gate', {
      instruction: `Go to ${server.url('/gate')}, read the article there, and summarise it.`,
    });

    expect(result.status).toBe('blocked');
    expect(result.blocker?.kind).toBe('captcha');
    expect(server.isGatePassed).toBe(false);
  });

  it('signs in with supplied credentials and never returns the password', async () => {
    const { password, inboxCount } = server.codes;
    const result = await runTask('login', {
      instruction: `Go to ${server.url('/login')}, sign in, then report how many unread messages the inbox shows.`,
      credentials: { platform: server.host, username: 'ahe_bot', password },
    });

    expect(result.status).toBe('done');
    expect(server.logins.at(-1)).toEqual({ username: 'ahe_bot', password });
    expect([...Object.values(result.metricReadings), result.summary].join(' ')).toContain(String(inboxCount));
    expect(JSON.stringify(result)).not.toContain(password);
  });
});
