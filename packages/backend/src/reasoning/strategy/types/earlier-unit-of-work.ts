import type { JobOrderType, JobOutcomeStatus, UnitOfWorkStatus } from '@ahe/agent-core';

/**
 * One Job of an earlier Unit, as the planner reads it: what it tried, how it ended, and how it was
 * marked. `evaluation` is null until the Job has been scored — a `continuous` round is evaluated a day late.
 */
export interface PastJob {
  readonly name: string;
  readonly objective: string;
  readonly orderType: JobOrderType;
  readonly outcomeStatus: JobOutcomeStatus | null;
  readonly outcomeSummary: string | null;
  readonly evaluation: { readonly score: number; readonly whatGood: string; readonly whatBad: string } | null;
}

/**
 * An earlier Unit of the same Strategy, with its Jobs in order.
 */
export interface PastUnit {
  readonly name: string;
  readonly status: UnitOfWorkStatus;
  readonly jobs: readonly PastJob[];
}
