/**
 * The reasoning layer's verdict on a Job: was its objective met, and what's left to do.
 * This is the compressed view the Unit review reads.
 */
export interface JobEvaluation {
  readonly jobId: string;
  readonly jobName: string;
  readonly isObjectiveMet: boolean;
  /** A few sentences on what the Tasks achieved, with the metric readings that matter. */
  readonly summary: string;
  /** Extra Task actions that would finish the objective; empty when it's met or not worth pursuing. */
  readonly followUpActions: readonly string[];
}
