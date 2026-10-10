/**
 * Ordered atomic actions to add to a Job as pending Tasks.
 */
export interface CreateTasksInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly actions: readonly string[];
}
