import type { JobOutcomeStatus } from '@ahe/agent-core';

/**
 * One Job as the Unit review sees it. Closed Jobs carry their outcome; Jobs still open at cycle end
 * are judged by `evaluateJob` and have a null outcome.
 *
 * `abandoned` and `failed` mean different things: abandoned is a strategic signal (Job reasoning chose
 * to stop — wrong place, not worth it), failed is an execution signal (it could not be done).
 */
export interface JobEvaluation {
  readonly jobId: string;
  readonly jobName: string;
  readonly outcomeStatus: JobOutcomeStatus | null;
  /** A few sentences on what the Tasks achieved, with the metric readings that matter. */
  readonly summary: string;
  /** For open Jobs: Task actions that would finish the objective next cycle; empty otherwise. */
  readonly followUpActions: readonly string[];
}
