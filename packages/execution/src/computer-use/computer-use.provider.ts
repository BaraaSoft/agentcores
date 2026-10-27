import type { ExecutionProvider, ExecutionResult, ExecutionTask } from '@ahe/agent-core';
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta';
import { ActionExecutor } from '../actions/action-executor';
import { AnthropicComputerToolset } from '../anthropic/anthropic-computer-toolset';
import { TASK_REPORT_TOOL } from '../task-report/task-report-tool';
import { DisplayGeometry } from '../geometry/display-geometry';
import { redactSecrets } from '../utils/redact-secrets';
import type { ComputerUseComponents } from './computer-use-components';
import type { ComputerUseOptions } from './computer-use-options';
import { buildSystemPrompt, buildTaskPrompt } from './execution.prompts';
import type { ExecutionTurn } from './types/execution-turn';

/**
 * The execution layer. Runs one mechanical instruction through Anthropic's computer-use
 * tool runner (screenshot → model → actions, repeated) and returns only a compressed text summary.
 *
 * Each task gets a fresh conversation, a fresh toolset, and a pixel geometry fixed for its duration.
 */
export class ComputerUseProvider implements ExecutionProvider {
  constructor(
    private readonly components: ComputerUseComponents,
    private readonly options: ComputerUseOptions,
  ) {}

  /**
   * Executes the instruction end to end. Stops when the model calls `submit_task_report` (done, blocked, or failed),
   * `task.maxSteps` model turns have run, or `signal` aborts (which returns a failed result).
   * The account password, when supplied, is redacted from everything returned.
   * Missing macOS permissions and API errors are thrown, so the backend's Task processor can fail or escalate the Task.
   */
  async runTask(task: ExecutionTask, signal?: AbortSignal): Promise<ExecutionResult> {
    await this.assertPermissions();
    const toolset = await this.createToolset();

    const secrets = task.credentials === null ? [] : [task.credentials.password];
    let stepsTaken = 0;
    let lastMessage: BetaMessage | null = null;
    let report: unknown = null;
    try {
      const runner = this.components.client.beta.messages.toolRunner(
        {
          model: this.options.modelId,
          max_tokens: this.options.maxTokens,
          system: buildSystemPrompt({ date: new Date(), maxSteps: task.maxSteps }),
          tools: [toolset, TASK_REPORT_TOOL],
          messages: [{ role: 'user', content: buildTaskPrompt(task) }],
          max_iterations: task.maxSteps,
        },
        { signal },
      );
      for await (const message of runner) {
        stepsTaken += 1;
        lastMessage = message;
        this.options.onTurn?.(this.turnOf(stepsTaken, message, secrets));
        report = this.reportOf(message);
        if (report !== null) {
          break;
        }
      }
    } catch (error) {
      if (signal?.aborted) {
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
      throw error;
    } finally {
      await toolset.close();
    }

    const state = this.components.reportParser.parse({
      report,
      finalText: lastMessage === null ? null : this.textOf(lastMessage),
      isStoppedAtStepLimit: lastMessage?.stop_reason === 'tool_use',
      secrets,
    });
    return { ...state, stepsTaken };
  }

  /** Builds this task's toolset around a geometry measured from the display right now. */
  private async createToolset(): Promise<AnthropicComputerToolset> {
    const { desktop, guard } = this.components;
    const geometry = DisplayGeometry.fit(await desktop.pointer.getDisplaySize(), this.options.maxScreenshotSize);
    const executor = new ActionExecutor(desktop, geometry, this.options.settleDelayMs);
    return new AnthropicComputerToolset(executor, guard, desktop.pointer.maxClickCount >= 3);
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

  /** The report input when the message's only tool call is `submit_task_report`; otherwise null. */
  private reportOf(message: BetaMessage): unknown {
    const toolUses = message.content.filter((block) => block.type === 'tool_use');
    const [only] = toolUses;
    return toolUses.length === 1 && only.name === TASK_REPORT_TOOL.name ? only.input : null;
  }

  private turnOf(turn: number, message: BetaMessage, secrets: readonly string[]): ExecutionTurn {
    const toolCalls = message.content.flatMap((block) =>
      block.type === 'tool_use' ? [redactSecrets(`${block.name} ${JSON.stringify(block.input)}`, secrets)] : [],
    );
    return { turn, text: redactSecrets(this.textOf(message), secrets), toolCalls };
  }

  private textOf(message: BetaMessage): string {
    return message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');
  }
}
