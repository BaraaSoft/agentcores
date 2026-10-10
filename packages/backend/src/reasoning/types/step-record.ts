import type { ExecutionBlocker, ExecutionStatus } from '@ahe/agent-core';

/**
 * One completed step of a Task, as the reasoning layer remembers it:
 * what it asked for and the compressed summary it got back.
 */
export interface StepRecord {
  readonly instruction: string;
  readonly status: ExecutionStatus;
  readonly summary: string;
  readonly blocker: ExecutionBlocker | null;
}
