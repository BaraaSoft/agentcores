import type { TaskResult, TaskStatus } from '@agentcores/agent-core';

/**
 * How one Task of a Job ended, as the Job level sees it: the action, its final status, the
 * compressed result or the reason it failed, and where it was performed. Individual steps never
 * reach the Job level.
 */
export interface TaskOutcome {
  readonly action: string;
  readonly status: TaskStatus;
  readonly result: TaskResult | null;
  readonly failureReason: string | null;
  /** Where a completed Task was performed, e.g. the permalink of the post; `null` when unknown. */
  readonly locationPath: string | null;
  /** Brief steps to reach that view in software; `null` for web pages and files. */
  readonly locationDetails: string | null;
}
