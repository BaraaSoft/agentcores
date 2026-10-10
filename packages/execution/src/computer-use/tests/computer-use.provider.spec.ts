import type { ExecutionTask } from '@ahe/agent-core';
import type Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlock, BetaMessage } from '@anthropic-ai/sdk/resources/beta';
import { PermissiveActionGuard } from '../../actions/permissive-action-guard';
import type { TaskReport } from '../../task-report/task-report.schema';
import { TaskReportParser } from '../../task-report/task-report-parser';
import { FakeDesktopDriver } from '../../driver/testing/fake-desktop-driver';
import { ComputerUseProvider } from '../computer-use.provider';
import type { ExecutionTurn } from '../types/execution-turn';

const message = (stopReason: BetaMessage['stop_reason'], content: Partial<BetaContentBlock>[]): BetaMessage =>
  ({ role: 'assistant', stop_reason: stopReason, content }) as unknown as BetaMessage;

const text = (value: string): Partial<BetaContentBlock> => ({ type: 'text', text: value });

const toolUse = (name: string, input: unknown): Partial<BetaContentBlock> => ({ type: 'tool_use', id: name, name, input });

const reportCall = (report: TaskReport, ...others: Partial<BetaContentBlock>[]): BetaMessage =>
  message('tool_use', [text('Reporting.'), ...others, toolUse('submit_task_report', report)]);

/** A client whose tool runner yields `messages` and records the request it was given. */
const fakeClient = (messages: BetaMessage[], requests: unknown[]): Anthropic =>
  ({
    beta: {
      messages: {
        toolRunner: (params: unknown) => {
          requests.push(params);
          return (async function* () {
            yield* messages;
          })();
        },
      },
    },
  }) as unknown as Anthropic;

describe('ComputerUseProvider', () => {
  const task: ExecutionTask = {
    taskId: 't1',
    instruction: 'Upvote the top post.',
    context: 'Subreddit: r/AICompanion',
    maxSteps: 10,
    credentials: null,
  };
  const options = {
    modelId: 'claude-sonnet-5-5',
    maxTokens: 1024,
    maxScreenshotSize: { width: 1280, height: 800 },
    settleDelayMs: 0,
    onTurn: null,
  };
  const done: TaskReport = {
    status: 'done',
    summary: 'Top post upvoted.',
    finalLocation: 'Chrome — reddit.com',
    blocker: null,
    metricReadings: [{ name: 'upvotes', value: 42 }],
  };

  const createProvider = (desktop: FakeDesktopDriver, messages: BetaMessage[], requests: unknown[] = []) =>
    new ComputerUseProvider(
      { client: fakeClient(messages, requests), desktop, guard: new PermissiveActionGuard(), reportParser: new TaskReportParser() },
      options,
    );

  it('returns the submitted report and the number of model turns', async () => {
    const requests: unknown[] = [];
    const provider = createProvider(
      new FakeDesktopDriver(),
      [message('tool_use', [text('Taking a screenshot.'), toolUse('computer', {})]), reportCall(done)],
      requests,
    );

    const result = await provider.runTask(task);

    expect(result).toEqual({
      status: 'done',
      summary: 'Top post upvoted.',
      finalLocation: 'Chrome — reddit.com',
      blocker: null,
      stepsTaken: 2,
      metricReadings: { upvotes: 42 },
    });
    expect(requests[0]).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_iterations: 10,
      tools: [expect.anything(), { name: 'submit_task_report', strict: true }],
    });
    expect(JSON.stringify(requests[0])).toContain('Upvote the top post.');
    expect(JSON.stringify(requests[0])).not.toContain('robot_credentials>\\nusername');
  });

  it('stops the loop at the report', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [reportCall(done), message('end_turn', [text('Anything else?')])]);
    expect(await provider.runTask(task)).toMatchObject({ status: 'done', stepsTaken: 1 });
  });

  it('keeps going when the report comes with other actions in the same turn', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [
      reportCall(done, toolUse('computer', {})),
      reportCall({ ...done, summary: 'Confirmed after a screenshot.' }),
    ]);
    expect(await provider.runTask(task)).toMatchObject({ summary: 'Confirmed after a screenshot.', stepsTaken: 2 });
  });

  it('passes credentials to the model and redacts the password from the result', async () => {
    const requests: unknown[] = [];
    const provider = createProvider(
      new FakeDesktopDriver(),
      [
        reportCall({
          status: 'blocked',
          summary: 'Signed in with s3cret-pass, then a code was asked.',
          finalLocation: 'Chrome — reddit.com/login',
          blocker: { kind: 'verification_code', detail: 'Email code prompt.' },
          metricReadings: [],
        }),
      ],
      requests,
    );

    const result = await provider.runTask({
      ...task,
      credentials: { platform: 'reddit.com', username: 'ahe_bot', password: 's3cret-pass' },
    });

    expect(JSON.stringify(requests[0])).toContain('<robot_credentials site=\\"reddit.com\\">');
    expect(result.status).toBe('blocked');
    expect(result.blocker).toEqual({ kind: 'verification_code', detail: 'Email code prompt.' });
    expect(JSON.stringify(result)).not.toContain('s3cret-pass');
  });

  it('reports every turn as redacted text to onTurn', async () => {
    const turns: ExecutionTurn[] = [];
    const provider = new ComputerUseProvider(
      {
        client: fakeClient([message('tool_use', [text('Typing the password.'), toolUse('computer', { text: 's3cret-pass' })]), reportCall(done)], []),
        desktop: new FakeDesktopDriver(),
        guard: new PermissiveActionGuard(),
        reportParser: new TaskReportParser(),
      },
      { ...options, onTurn: (turn) => turns.push(turn) },
    );

    await provider.runTask({ ...task, credentials: { platform: 'reddit.com', username: 'ahe_bot', password: 's3cret-pass' } });

    expect(turns).toEqual([
      { turn: 1, text: 'Typing the password.', toolCalls: ['computer {"text":"[redacted]"}'] },
      { turn: 2, text: 'Reporting.', toolCalls: [expect.stringMatching(/^submit_task_report /)] },
    ]);
  });

  it('reports failure when the step limit ends the loop', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [message('tool_use', [text('Still scrolling.'), toolUse('computer', {})])]);
    expect(await provider.runTask(task)).toMatchObject({ status: 'failed', stepsTaken: 1 });
  });

  it('reports failure when the model ends its turn without a report', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [message('end_turn', [text('All done!')])]);
    expect(await provider.runTask(task)).toMatchObject({ status: 'failed', summary: 'Finished without a task report: All done!' });
  });

  it('refuses to start without macOS permissions', async () => {
    const desktop = new FakeDesktopDriver();
    desktop.permissions = { canControlInput: true, canCaptureScreen: false };
    await expect(createProvider(desktop, []).runTask(task)).rejects.toThrow(/Screen Recording: false/);
  });
});
