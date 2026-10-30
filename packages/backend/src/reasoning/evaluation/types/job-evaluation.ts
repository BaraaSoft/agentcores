import type { JobOutcomeStatus } from '@ahe/agent-core';

/**
 * One scored Job as the Strategy planner reads it when it looks for Jobs like the ones it is about
 * to write.
 *
 * `abandoned` and `failed` mean different things: abandoned is a strategic signal (Job reasoning
 * chose to stop — wrong place, not worth it), failed is an execution signal (it could not be done).
 */
export interface JobEvaluation {
  readonly jobId: string;
  readonly jobName: string;
  readonly outcomeStatus: JobOutcomeStatus | null;
  /** 1–10 against the objective. */
  readonly score: number;
  /** The objective in general terms. */
  readonly objectiveSummary: string;
  readonly whatGood: string;
  readonly whatBad: string;
}
