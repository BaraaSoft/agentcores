import type { ExecutionProvider, ExecutionResult, ExecutionTask } from '@ahe/agent-core';
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta';
import { ActionExecutor } from '../actions/action-executor';
import { AnthropicComputerToolset } from '../anthropic/anthropic-computer-toolset';
import { DisplayGeometry } from '../geometry/display-geometry';
import type { ComputerUseComponents } from './computer-use-components';
import type { ComputerUseOptions } from './computer-use-options';
import { buildSystemPrompt, buildTaskPrompt } from './execution.prompts';

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
   * Executes the instruction end to end. Stops when the model sends its task report (done, blocked, or failed),
   * `task.maxSteps` model turns have run, or `signal` aborts (which returns a failed result).
   * The account password, when supplied, is redacted from everything returned.
   * Missing macOS permissions and API errors are thrown, so the harness can retry or escalate.
   */
  async runTask(task: ExecutionTask, signal?: AbortSignal): Promise<ExecutionResult> {
    await this.assertPermissions();
    const toolset = await this.createToolset();

    let stepsTaken = 0;
    let lastMessage: BetaMessage | null = null;
    try {
      const runner = this.components.client.beta.messages.toolRunner(
        {
          model: this.options.modelId,
          max_tokens: this.options.maxTokens,
          system: buildSystemPrompt({ date: new Date(), maxSteps: task.maxSteps }),
          tools: [toolset],
          messages: [{ role: 'user', content: buildTaskPrompt(task) }],
          max_iterations: task.maxSteps,
        },
        { signal },
      );
      for await (const message of runner) {
        stepsTaken += 1;
        lastMessage = message;
      }
    } catch (error) {
      if (signal?.aborted) {
        return {
          status: 'failed',
          summary: 'Cancelled before the instruction finished.',
          finalLocation: '',
          blocker: null,
          stepsTaken,
          metricReadings: {},
        };
      }
      throw error;
    } finally {
      await toolset.close();
    }

    const state = this.components.reportParser.parse(
      lastMessage === null ? null : this.textOf(lastMessage),
      lastMessage?.stop_reason === 'tool_use',
      task.credentials === null ? [] : [task.credentials.password],
    );
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

  private textOf(message: BetaMessage): string {
    return message.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n');
  }
}
