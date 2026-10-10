/**
 * Asks for the next pending Tasks of a Workflow, at most `limit`.
 */
export interface ListPendingTasksInput {
  readonly workflowId: string;
  readonly limit: number;
}
