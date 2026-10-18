/**
 * What one scheduling pass did for a Workflow.
 */
export interface SchedulingResult {
  readonly workflowId: string;
  readonly queuedJobIds: readonly string[];
  /** Why nothing (more) was scheduled, e.g. "at Job limit" or "budget reached". */
  readonly skippedReason: string | null;
}
