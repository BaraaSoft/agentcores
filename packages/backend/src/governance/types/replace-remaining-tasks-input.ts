import type { PlannedTask } from '../../reasoning/job/types/planned-task';

/**
 * The new plan for a Job's Tasks that have not started yet, in order.
 */
export interface ReplaceRemainingTasksInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly tasks: readonly PlannedTask[];
}
