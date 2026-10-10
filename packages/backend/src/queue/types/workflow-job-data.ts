/**
 * Payload for queue jobs that act on a whole Workflow
 * (daily report, strategy evaluation).
 */
export interface WorkflowJobData {
  readonly workflowId: string;
}
