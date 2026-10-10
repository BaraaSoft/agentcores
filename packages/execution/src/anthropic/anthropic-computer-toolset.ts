import {
  BetaAbstractComputerToolset20260801,
  ToolError,
  type BetaComputerConfirmContext,
  type BetaComputerMemberResult,
  type BetaToolsetCallContext,
} from '@anthropic-ai/sdk/helpers/beta/toolsets';
import type { BetaComputerMemberInput, BetaComputerMemberName } from '@anthropic-ai/sdk/resources/beta';
import type { ActionExecutor } from '../actions/action-executor';
import type { ActionGuard } from '../actions/action-guard';
import type { ActionOutcome } from '../actions/action-outcome';
import { ActionRefusedError } from '../actions/action-refused.error';
import { ToolCallMapper } from './tool-call-mapper';

/**
 * Our driver for Anthropic's `computer_toolset_20260801`. The SDK's tool runner sends every
 * member call here; we map it to a ToolCall, ask the guard, and hand it to ActionExecutor.
 *
 * The SDK handles the rest of the protocol: batches run in order and stop at the first failure,
 * `tool_result` blocks are built for us, and a refused call is answered as declined.
 * One instance serves one task.
 */
export class AnthropicComputerToolset extends BetaAbstractComputerToolset20260801 {
  /**
   * @param executor performs ToolCalls on the desktop
   * @param guard approves each call before it runs
   * @param isTripleClickEnabled false when the pointer driver can't triple-click; the member is then hidden from the model
   */
  constructor(
    private readonly executor: ActionExecutor,
    guard: ActionGuard,
    isTripleClickEnabled: boolean,
  ) {
    super({
      configs: isTripleClickEnabled ? undefined : { triple_click: { enabled: false } },
      confirm: (ctx) => AnthropicComputerToolset.confirmWith(guard, ctx),
    });
  }

  /** Runs one member call. Every member goes through here, so none is left unimplemented. */
  protected override async execute(
    ctx: BetaToolsetCallContext,
    name: BetaComputerMemberName,
    input: BetaComputerMemberInput,
  ): Promise<BetaComputerMemberResult> {
    try {
      const outcome = await this.executor.perform(ToolCallMapper.fromMember(name, input), ctx.signal);
      return AnthropicComputerToolset.toMemberResult(outcome);
    } catch (error) {
      if (ctx.signal?.aborted) {
        throw error;
      }
      if (error instanceof ActionRefusedError) {
        throw new ToolError(error.message);
      }
      // Desktop errors can carry local paths and command output; the model only needs to know it failed.
      throw new ToolError(`The ${name} action failed on the desktop. Take a screenshot to see the current state.`);
    }
  }

  /**
   * The SDK's approval hook, answered by our guard. Malformed input is let through here
   * so `execute` can refuse it with a message the model can act on.
   */
  private static async confirmWith(guard: ActionGuard, ctx: BetaComputerConfirmContext): Promise<boolean> {
    try {
      return await guard.allows(ToolCallMapper.fromMember(ctx.member, ctx.input));
    } catch (error) {
      if (error instanceof ActionRefusedError) {
        return true;
      }
      throw error;
    }
  }

  /** Converts our outcome into the shape the SDK renders for the model. */
  private static toMemberResult(outcome: ActionOutcome): BetaComputerMemberResult {
    switch (outcome.kind) {
      case 'image':
        return { data: outcome.image.data.toString('base64'), mediaType: outcome.image.mediaType };
      case 'cursor':
        return { x: outcome.position.x, y: outcome.position.y };
      case 'done':
        return undefined;
    }
  }
}
