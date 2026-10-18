import type { TaskResult, TaskStatus } from '@ahe/agent-core';

/**
 * How one Task of a Job ended, as the Job level sees it: the action, its final status,
 * and the compressed result. Individual steps never reach the Job level.
 */
export interface TaskOutcome {
  readonly action: string;
  readonly status: TaskStatus;
  readonly result: TaskResult | null;
}
