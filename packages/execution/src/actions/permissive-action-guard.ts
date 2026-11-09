import type { ToolCall } from '@agentcores/agent-core';
import type { ActionGuard } from './action-guard';

/**
 * Approves every call. The default until the backend supplies a real policy;
 * value limits (wait length, repeat count, points on screen) still apply in ActionExecutor.
 */
export class PermissiveActionGuard implements ActionGuard {
  async allows(_toolCall: ToolCall): Promise<boolean> {
    return true;
  }
}
