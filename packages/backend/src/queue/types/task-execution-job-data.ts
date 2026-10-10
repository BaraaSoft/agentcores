/**
 * Payload for a `task-execution` queue job: which Task to run, and for which Workflow.
 */
export interface TaskExecutionJobData {
  readonly workflowId: string;
  readonly taskId: string;
}
