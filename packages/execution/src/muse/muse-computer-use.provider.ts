import type { ExecutionProvider, ExecutionResult, ExecutionTask, Screenshot } from '@ahe/agent-core';
import type Anthropic from '@anthropic-ai/sdk';
import { ActionExecutor } from '../actions/action-executor';
import type { ActionOutcome } from '../actions/action-outcome';
import { ActionRefusedError } from '../actions/action-refused.error';
import type { ComputerUseComponents } from '../computer-use/computer-use-components';
import type { ComputerUseOptions } from '../computer-use/computer-use-options';
import { buildTaskPrompt } from '../computer-use/execution.prompts';
import type { ExecutionTurn } from '../computer-use/types/execution-turn';
import { DisplayGeometry } from '../geometry/display-geometry';
import { redactSecrets } from '../utils/redact-secrets';
import { MuseComputerTools } from './muse-computer-tools';
import { MuseConversation } from './muse-conversation';
import { buildMuseSystemPrompt, MUSE_LAST_TURN_NOTE, MUSE_NUDGE } from './muse-execution.prompts';
import { MUSE_TASK_REPORT_TOOL } from './muse-task-report-tool';
import { normalizeMuseReport } from './normalize-muse-report';

type ToolUseBlock = Anthropic.Messages.ToolUseBlock;
type ToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam;

/** How many times a turn without a tool call is answered with a nudge before the task ends without a report. */
const MAX_NUDGES = 2;
/** How many of the newest screenshots stay in the conversation. */
const KEPT_SCREENSHOTS = 3;

const REPORT_WITH_ACTIONS =
  'Report not accepted: it was sent together with computer actions. Check their outcome with a screenshot, then call submit_task_report alone.';
const SKIPPED = 'Skipped, because an earlier action in this turn failed.';
const DECLINED = 'This action was declined by the safety policy. Choose another way.';

/**
 * The execution layer on Muse, through Meta's Anthropic-compatible Messages API. Meta runs no computer tool, so
 * this provider runs its own loop with plain tools (screenshot → model → actions, repeated) on the same
 * ActionExecutor, guard, prompts, and report parser as ComputerUseProvider.
 *
 * It differs from the Claude loop in four ways, each found in live tests: the system prompt fixes the coordinate
 * space, a turn without a tool call gets a nudge, only the newest screenshots stay, and the report is repaired
 * before it is checked, because Meta does not enforce strict tool schemas.
 */
export class MuseComputerUseProvider implements ExecutionProvider {
  constructor(
    private readonly components: ComputerUseComponents,
    private readonly options: ComputerUseOptions,
  ) {}

  /**
   * Executes the instruction end to end. Stops when Muse calls `submit_task_report` alone, `task.maxSteps` model
   * turns have run, Muse stops calling tools, or `signal` aborts (which returns a failed result).
   * Missing macOS permissions and API errors are thrown, so the backend's Task processor can fail or escalate the Task.
   */
  async runTask(task: ExecutionTask, signal?: AbortSignal): Promise<ExecutionResult> {
    await this.assertPermissions();
    const geometry = await this.measureGeometry();
    const tools = new MuseComputerTools(geometry.screenshotSize, this.components.desktop.pointer.maxClickCount >= 3);
    const executor = new ActionExecutor(this.components.desktop, geometry, this.options.settleDelayMs);
    const conversation = new MuseConversation(buildTaskPrompt(task), KEPT_SCREENSHOTS);
    const system = buildMuseSystemPrompt({ date: new Date(), maxSteps: task.maxSteps, screenshotSize: geometry.screenshotSize });
    const secrets = task.credentials === null ? [] : [task.credentials.password];

    let stepsTaken = 0;
    let nudges = 0;
    let lastMessage: Anthropic.Messages.Message | null = null;
    let report: unknown = null;
    try {
      while (stepsTaken < task.maxSteps && report === null) {
        const message = await this.components.client.messages.create(
          {
            model: this.options.modelId,
            max_tokens: this.options.maxTokens,
            system,
            tools: [...tools.definitions(), MUSE_TASK_REPORT_TOOL],
            messages: [...conversation.messages],
          },
          { signal },
        );
        stepsTaken += 1;
        lastMessage = message;
        this.options.onTurn?.(this.turnOf(stepsTaken, message, secrets));
        conversation.addModelTurn(message.content);

        const calls = message.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
        if (calls.length === 0) {
          if (nudges >= MAX_NUDGES) break;
          nudges += 1;
          conversation.addUserText(MUSE_NUDGE);
          continue;
        }
        const isLastTurn = stepsTaken === task.maxSteps;
        report = this.reportOf(calls, isLastTurn);
        if (report === null) {
          const results = await this.perform(calls, tools, executor, signal);
          conversation.addToolResults(results, stepsTaken === task.maxSteps - 1 ? MUSE_LAST_TURN_NOTE : undefined);
        }
      }
    } catch (error) {
      if (signal?.aborted) return this.cancelled(stepsTaken);
      throw error;
    }

    const state = this.components.reportParser.parse({
      report: report === null ? null : normalizeMuseReport(report),
      finalText: lastMessage === null ? null : this.textOf(lastMessage),
      isStoppedAtStepLimit: report === null && lastMessage?.stop_reason === 'tool_use',
      secrets,
    });
    if (task.returnsScreenshot !== true) return { ...state, stepsTaken };
    const finalScreenshot = await this.captureFinalScreen(geometry);
    return finalScreenshot === null ? { ...state, stepsTaken } : { ...state, stepsTaken, finalScreenshot };
  }

  /** Runs one turn's calls in order. After the first failure, the rest are skipped, since they assumed it worked. */
  private async perform(
    calls: readonly ToolUseBlock[],
    tools: MuseComputerTools,
    executor: ActionExecutor,
    signal?: AbortSignal,
  ): Promise<ToolResultBlockParam[]> {
    const results: ToolResultBlockParam[] = [];
    let hasFailed = false;
    for (const call of calls) {
      const result: ToolResultBlockParam = hasFailed
        ? this.errorResult(call, SKIPPED)
        : await this.performOne(call, tools, executor, signal);
      hasFailed ||= result.is_error === true;
      results.push(result);
    }
    return results;
  }

  private async performOne(
    call: ToolUseBlock,
    tools: MuseComputerTools,
    executor: ActionExecutor,
    signal?: AbortSignal,
  ): Promise<ToolResultBlockParam> {
    if (call.name === MUSE_TASK_REPORT_TOOL.name) return { type: 'tool_result', tool_use_id: call.id, content: REPORT_WITH_ACTIONS };
    try {
      const toolCall = tools.toToolCall(call.name, call.input);
      if (!(await this.components.guard.allows(toolCall))) return this.errorResult(call, DECLINED);
      return this.outcomeResult(call, await executor.perform(toolCall, signal));
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ActionRefusedError) return this.errorResult(call, error.message);
      // Desktop errors can carry local paths and command output; the model only needs to know it failed.
      return this.errorResult(call, `The ${call.name} action failed on the desktop. Take a screenshot to see the current state.`);
    }
  }

  private outcomeResult(call: ToolUseBlock, outcome: ActionOutcome): ToolResultBlockParam {
    switch (outcome.kind) {
      case 'image':
        return {
          type: 'tool_result',
          tool_use_id: call.id,
          content: [
            { type: 'image', source: { type: 'base64', media_type: outcome.image.mediaType, data: outcome.image.data.toString('base64') } },
          ],
        };
      case 'cursor':
        return { type: 'tool_result', tool_use_id: call.id, content: `[${outcome.position.x}, ${outcome.position.y}]` };
      case 'done':
        return { type: 'tool_result', tool_use_id: call.id, content: 'Done.' };
    }
  }

  private errorResult(call: ToolUseBlock, message: string): ToolResultBlockParam {
    return { type: 'tool_result', tool_use_id: call.id, content: message, is_error: true };
  }

  /**
   * The report input when the turn's only tool call is `submit_task_report`; otherwise null. On the last turn a
   * report sent with actions counts too, and the actions are skipped, since no later turn could report them.
   */
  private reportOf(calls: readonly ToolUseBlock[], isLastTurn: boolean): unknown {
    const reports = calls.filter((call) => call.name === MUSE_TASK_REPORT_TOOL.name);
    if (reports.length === 0) return null;
    return calls.length === 1 || isLastTurn ? reports[0].input : null;
  }

  private cancelled(stepsTaken: number): ExecutionResult {
    return {
      status: 'failed',
      summary: 'Cancelled before the instruction finished.',
      locationPath: '',
      locationDetails: '',
      blocker: null,
      stepsTaken,
      metricReadings: {},
    };
  }

  /** The pixel spaces for one task, measured from the display right now. */
  private async measureGeometry(): Promise<DisplayGeometry> {
    return DisplayGeometry.fit(await this.components.desktop.pointer.getDisplaySize(), this.options.maxScreenshotSize);
  }

  /** The screen as the task ended. A failed capture returns null, so a finished task is never lost for want of its picture. */
  private async captureFinalScreen(geometry: DisplayGeometry): Promise<Screenshot | null> {
    const { screen, images } = this.components.desktop;
    try {
      const image = await images.resize(await screen.capture(), geometry.screenshotSize);
      return { mediaType: image.mediaType, base64: image.data.toString('base64') };
    } catch {
      return null;
    }
  }

  /** Fails closed: without both macOS permissions, captures are blank and input is silently dropped. */
  private async assertPermissions(): Promise<void> {
    const { canControlInput, canCaptureScreen } = await this.components.desktop.checkPermissions();
    if (!canControlInput || !canCaptureScreen) {
      throw new Error(
        `Desktop permissions missing (Accessibility: ${canControlInput}, Screen Recording: ${canCaptureScreen}). ` +
          'Grant them to the Node process, e.g. with `pnpm --filter @ahe/execution check:desktop`.',
      );
    }
  }

  private turnOf(turn: number, message: Anthropic.Messages.Message, secrets: readonly string[]): ExecutionTurn {
    const toolCalls = message.content.flatMap((block) =>
      block.type === 'tool_use' ? [redactSecrets(`${block.name} ${JSON.stringify(block.input)}`, secrets)] : [],
    );
    return { turn, text: redactSecrets(this.textOf(message), secrets), toolCalls };
  }

  private textOf(message: Anthropic.Messages.Message): string {
    return message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');
  }
}
