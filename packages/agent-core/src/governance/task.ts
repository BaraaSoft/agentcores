import type { TaskResult } from './task-result';
import type { TaskStatus } from './task-status';

/**
 * An atomic action executed by the execution layer via computer use,
 * e.g. "Post this content to X" or "Check engagement on yesterday's post".
 */
export interface Task {
  readonly id: string;
  readonly jobId: string;
  readonly action: string;
  readonly status: TaskStatus;
  readonly result: TaskResult | null;
}
