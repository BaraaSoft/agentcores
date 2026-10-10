import type { ToolCall } from '@ahe/agent-core';

/**
 * Approves or refuses each ToolCall before it touches the desktop.
 * The place for policy such as "never type text that matches sealed-zone data"
 * or "no keyboard input while a terminal has focus". A refused call is reported to the
 * model as declined, and the loop carries on.
 */
export interface ActionGuard {
  allows(toolCall: ToolCall): Promise<boolean>;
}
