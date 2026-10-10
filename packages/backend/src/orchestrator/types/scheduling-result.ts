/**
 * What one scheduling pass did for a Workflow.
 */
export interface SchedulingResult {
  readonly workflowId: string;
  readonly enqueuedTaskIds: readonly string[];
  /** Why nothing (more) was scheduled, e.g. "at concurrency limit" or "budget reached". */
  readonly skippedReason: string | null;
}
