import type { ExecutionBlocker } from '@ahe/agent-core';

/**
 * A gate the execution layer reported for an account during a Task.
 */
export interface RecordChallengeInput {
  readonly workflowId: string;
  readonly platform: string;
  readonly taskId: string;
  readonly blocker: ExecutionBlocker;
}
