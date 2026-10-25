/**
 * The new plan for a Job's Tasks that have not started yet, in order.
 */
export interface ReplaceRemainingTasksInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly actions: readonly string[];
}
