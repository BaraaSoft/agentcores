import type { ExecutionTask, ToolCall } from '@agentcores/agent-core';
import type Anthropic from '@anthropic-ai/sdk';
import type { ActionGuard } from '../../actions/action-guard';
import { PermissiveActionGuard } from '../../actions/permissive-action-guard';
import type { ExecutionTurn } from '../../computer-use/types/execution-turn';
import { FakeDesktopDriver } from '../../driver/testing/fake-desktop-driver';
import { TaskReportParser } from '../../task-report/task-report-parser';
import { MuseComputerUseProvider } from '../muse-computer-use.provider';

type Block = Record<string, unknown>;
type Request = { model: string; system: string; tools: { name: string }[]; messages: Anthropic.Messages.MessageParam[] };

const turn = (stopReason: string, ...content: Block[]) => ({ role: 'assistant', stop_reason: stopReason, content });
const text = (value: string): Block => ({ type: 'text', text: value });
let nextId = 0;
const call = (name: string, input: unknown = {}): Block => ({ type: 'tool_use', id: `toolu_${++nextId}`, name, input });

const report = {
  status: 'done',
  summary: 'Signed in.',
  locationPath: 'portal.acme.test/welcome',
  locationDetails: '',
  blocker: 'null',
  metricReadings: [{ name: 'unread', value: 3 }],
};
const reportTurn = (overrides: Partial<typeof report> = {}, ...others: Block[]) =>
  turn('tool_use', text('Reporting.'), ...others, call('submit_task_report', { ...report, ...overrides }));

/** A Meta client that answers with `turns` in order and keeps a copy of every request. */
const fakeClient = (turns: unknown[], requests: Request[]) =>
  ({
    messages: {
      create: async (params: Request, options?: { signal?: AbortSignal }) => {
        if (options?.signal?.aborted) throw new Error('aborted');
        requests.push(structuredClone(params));
        const next = turns.shift();
        if (next === undefined) throw new Error('No more scripted turns.');
        return next;
      },
    },
  }) as unknown as Anthropic;

/** The tool results Muse received in request `index`, by tool_use_id. */
const resultsIn = (request: Request) => {
  const last = request.messages.at(-1);
  return Array.isArray(last?.content) ? last.content.filter((block) => block.type === 'tool_result') : [];
};

describe('MuseComputerUseProvider', () => {
  const task: ExecutionTask = { taskId: 't1', instruction: 'Sign in to the portal.', context: '', maxSteps: 10, credentials: null };
  const options = {
    modelId: 'muse-wonder-1.0',
    maxTokens: 1024,
    maxScreenshotSize: { width: 1280, height: 800 },
    settleDelayMs: 0,
    onTurn: null,
  };

  const createProvider = (
    desktop: FakeDesktopDriver,
    turns: unknown[],
    requests: Request[] = [],
    guard: ActionGuard = new PermissiveActionGuard(),
  ) => new MuseComputerUseProvider({ client: fakeClient(turns, requests), desktop, guard, reportParser: new TaskReportParser() }, options);

  it('runs the plain-tool loop on the desktop and returns the repaired report', async () => {
    const desktop = new FakeDesktopDriver();
    const requests: Request[] = [];
    const provider = createProvider(
      desktop,
      [
        turn('tool_use', text('Starting.'), call('screenshot')),
        turn('tool_use', call('left_click', { coordinate: [640, 400] }), call('type', { text: 'demo@acme.test' }), call('screenshot')),
        reportTurn(),
      ],
      requests,
    );

    const result = await provider.runTask(task);

    expect(result).toEqual({
      status: 'done',
      summary: 'Signed in.',
      locationPath: 'portal.acme.test/welcome',
      locationDetails: '',
      blocker: null,
      metricReadings: { unread: 3 },
      stepsTaken: 3,
    });
    expect(desktop.calls).toEqual([
      'capture',
      'resize 1280x800',
      'moveTo 720,450',
      'click left x1',
      'type demo@acme.test',
      'capture',
      'resize 1280x800',
    ]);
    expect(requests[0].model).toBe('muse-wonder-1.0');
    expect(requests[0].system).toContain('Screenshots are 1280x800 pixels');
    expect(requests[0].tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(['screenshot', 'left_click', 'submit_task_report']));
    expect(JSON.stringify(requests[0].tools)).not.toContain('computer_toolset');
    expect(resultsIn(requests[1])[0]).toMatchObject({ content: [{ type: 'image', source: { media_type: 'image/png' } }] });
    expect(resultsIn(requests[2]).map((result) => result.content)).toEqual([
      'Done.',
      'Done.',
      [expect.objectContaining({ type: 'image' })],
    ]);
  });

  it('nudges Muse when it ends a turn in plain text, then accepts the report', async () => {
    const requests: Request[] = [];
    const provider = createProvider(new FakeDesktopDriver(), [turn('end_turn', text('I found the code.')), reportTurn()], requests);

    expect(await provider.runTask(task)).toMatchObject({ status: 'done', stepsTaken: 2 });
    expect(requests[1].messages.at(-1)).toEqual({ role: 'user', content: expect.stringContaining('call submit_task_report alone now') });
  });

  it('gives up after two nudges and reports the last text as a failure', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [
      turn('end_turn', text('Done.')),
      turn('end_turn', text('Really done.')),
      turn('end_turn', text('All done!')),
    ]);

    expect(await provider.runTask(task)).toMatchObject({
      status: 'failed',
      summary: 'Finished without a task report: All done!',
      stepsTaken: 3,
    });
  });

  it('answers refused input as an error and skips the rest of the turn', async () => {
    const desktop = new FakeDesktopDriver();
    const requests: Request[] = [];
    const provider = createProvider(
      desktop,
      [turn('tool_use', call('left_click', { coordinate: [5000, 10] }), call('type', { text: 'never typed' })), reportTurn()],
      requests,
    );

    await provider.runTask(task);

    expect(resultsIn(requests[1])).toEqual([
      expect.objectContaining({ is_error: true, content: '[5000, 10] is outside the 1280x800 screenshot.' }),
      expect.objectContaining({ is_error: true, content: 'Skipped, because an earlier action in this turn failed.' }),
    ]);
    expect(desktop.calls).not.toContain('type never typed');
  });

  it('answers a call the guard declines without touching the desktop', async () => {
    const desktop = new FakeDesktopDriver();
    const requests: Request[] = [];
    const guard: ActionGuard = { allows: async (toolCall: ToolCall) => toolCall.kind !== 'type' };
    const provider = createProvider(desktop, [turn('tool_use', call('type', { text: 'secret' })), reportTurn()], requests, guard);

    await provider.runTask(task);

    expect(resultsIn(requests[1])[0]).toMatchObject({ is_error: true, content: expect.stringContaining('declined') });
    expect(desktop.calls).toEqual([]);
  });

  it('keeps going when the report comes with other actions in the same turn', async () => {
    const provider = createProvider(new FakeDesktopDriver(), [
      reportTurn({}, call('screenshot')),
      reportTurn({ summary: 'Confirmed after a screenshot.' }),
    ]);

    expect(await provider.runTask(task)).toMatchObject({ summary: 'Confirmed after a screenshot.', stepsTaken: 2 });
  });

  it('reports failure when the step limit ends the loop', async () => {
    const turns = Array.from({ length: 3 }, () => turn('tool_use', call('screenshot')));
    const provider = createProvider(new FakeDesktopDriver(), turns);

    expect(await provider.runTask({ ...task, maxSteps: 3 })).toMatchObject({
      status: 'failed',
      summary: 'Stopped at the step limit before the instruction was finished.',
      stepsTaken: 3,
    });
  });

  it('asks for a report before the last turn, and only then', async () => {
    const requests: Request[] = [];
    const turns = Array.from({ length: 3 }, () => turn('tool_use', call('screenshot')));
    await createProvider(new FakeDesktopDriver(), turns, requests).runTask({ ...task, maxSteps: 3 });

    const notesIn = (request: Request) => JSON.stringify(request.messages.at(-1)).includes('This is your last turn.');
    expect(requests.map(notesIn)).toEqual([false, false, true]);
  });

  it('accepts a report sent with actions on the last turn, and skips the actions', async () => {
    const desktop = new FakeDesktopDriver();
    const provider = createProvider(desktop, [
      turn('tool_use', call('screenshot')),
      reportTurn({ status: 'failed', summary: 'Found the file on the Desktop, but did not open it.' }, call('left_click', { coordinate: [10, 10] })),
    ]);

    expect(await provider.runTask({ ...task, maxSteps: 2 })).toMatchObject({
      status: 'failed',
      summary: 'Found the file on the Desktop, but did not open it.',
      stepsTaken: 2,
    });
    expect(desktop.calls).not.toContain('click left x1');
  });

  it('returns a cancelled result when the signal aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createProvider(new FakeDesktopDriver(), [reportTurn()]);

    expect(await provider.runTask(task, controller.signal)).toMatchObject({
      status: 'failed',
      summary: 'Cancelled before the instruction finished.',
      stepsTaken: 0,
    });
  });

  it('reports every turn as redacted text and keeps the password out of the result', async () => {
    const turns: ExecutionTurn[] = [];
    const provider = new MuseComputerUseProvider(
      {
        client: fakeClient(
          [
            turn('tool_use', text('Typing s3cret-pass.'), call('type', { text: 's3cret-pass' })),
            reportTurn({ summary: 'Used s3cret-pass.' }),
          ],
          [],
        ),
        desktop: new FakeDesktopDriver(),
        guard: new PermissiveActionGuard(),
        reportParser: new TaskReportParser(),
      },
      { ...options, onTurn: (value) => turns.push(value) },
    );

    const result = await provider.runTask({
      ...task,
      credentials: { platform: 'portal.acme.test', username: 'ahe_bot', password: 's3cret-pass' },
    });

    expect(turns[0]).toEqual({ turn: 1, text: 'Typing [redacted].', toolCalls: ['type {"text":"[redacted]"}'] });
    expect(JSON.stringify(result)).not.toContain('s3cret-pass');
  });

  it('captures the final screen when the task asks for it', async () => {
    const desktop = new FakeDesktopDriver();
    const result = await createProvider(desktop, [reportTurn()]).runTask({ ...task, returnsScreenshot: true });

    expect(result.finalScreenshot).toEqual({ mediaType: 'image/png', base64: Buffer.from('resized 1280x800').toString('base64') });
  });

  it('refuses to start without macOS permissions', async () => {
    const desktop = new FakeDesktopDriver();
    desktop.permissions = { canControlInput: false, canCaptureScreen: true };
    await expect(createProvider(desktop, []).runTask(task)).rejects.toThrow(/Accessibility: false/);
  });
});
