import type { TaskResult } from '@agentcores/agent-core';

/**
 * Marks a Task complete with its result and where it was performed.
 */
export interface CompleteTaskInput {
  readonly taskId: string;
  readonly result: TaskResult;
  /** `null` when the execution layer reported no location. */
  readonly locationPath: string | null;
  readonly locationDetails: string | null;
}
