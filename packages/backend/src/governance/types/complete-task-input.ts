import type { TaskResult } from '@ahe/agent-core';

/**
 * Marks a Task complete with its result.
 */
export interface CompleteTaskInput {
  readonly taskId: string;
  readonly result: TaskResult;
}
