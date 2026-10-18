/**
 * Asks for the Workflow's Jobs that are ready to move, at most `limit`.
 */
export interface ListStartableJobsInput {
  readonly workflowId: string;
  readonly limit: number;
}
