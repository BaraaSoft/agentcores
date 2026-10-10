import type { ExecutionTask } from '@ahe/agent-core';
import type Anthropic from '@anthropic-ai/sdk';
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta';
import { PermissiveActionGuard } from '../../actions/permissive-action-guard';
import { TaskReportParser } from '../../compression/task-report-parser';
import { FakeDesktopDriver } from '../../testing/fake-desktop-driver';
import { ComputerUseProvider } from '../computer-use.provider';

const message = (stopReason: BetaMessage['stop_reason'], text: string): BetaMessage =>
  ({ role: 'assistant', stop_reason: stopReason, content: [{ type: 'text', text }] }) as unknown as BetaMessage;

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
  const options = { modelId: 'claude-sonnet-5-5', maxTokens: 1024, maxScreenshotSize: { width: 1280, height: 800 }, settleDelayMs: 0 };

  const createProvider = (desktop: FakeDesktopDriver, messages: BetaMessage[], requests: unknown[] = []) =>
    new ComputerUseProvider(
      { client: fakeClient(messages, requests), desktop, guard: new PermissiveActionGuard(), reportParser: new TaskReportParser() },
      options,
    );

  it('returns the compressed report and the number of model turns', async () => {
    const requests: unknown[] = [];
    const provider = createProvider(
      new FakeDesktopDriver(),
      [
        message('tool_use', 'Taking a screenshot.'),
        message(
          'end_turn',
          '<task_report>{"status": "done", "summary": "Top post upvoted.", "finalLocation": "Chrome — reddit.com", "blocker": null, "metricReadings": {"upvotes": 42}}</task_report>',
        ),
      ],
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
    expect(requests[0]).toMatchObject({ model: 'claude-sonnet-5-5', max_iterations: 10 });
    expect(JSON.stringify(requests[0])).toContain('Upvote the top post.');
    expect(JSON.stringify(requests[0])).not.toContain('robot_credentials>\\nusername');
  });

  it('passes credentials to the model and redacts the password from the result', async () => {
    const requests: unknown[] = [];
    const provider = createProvider(
      new FakeDesktopDriver(),
      [
        message(
          'end_turn',
          '<task_report>{"status": "blocked", "summary": "Signed in with s3cret-pass, then a code was asked.", "blocker": {"kind": "verification_code", "detail": "Email code prompt."}}</task_report>',
        ),
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

  it('reports failure when the step limit ends the loop', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [message('tool_use', 'Still scrolling.')]);
    expect(await provider.runTask(task)).toMatchObject({ status: 'failed', stepsTaken: 1 });
  });

  it('refuses to start without macOS permissions', async () => {
    const desktop = new FakeDesktopDriver();
    desktop.permissions = { canControlInput: true, canCaptureScreen: false };
    await expect(createProvider(desktop, []).runTask(task)).rejects.toThrow(/Screen Recording: false/);
  });
});
