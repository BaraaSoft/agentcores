import type { JobOrderType, JobOutcomeStatus, UnitOfWorkStatus } from '@agentcores/agent-core';

/**
 * One Job of an earlier Unit of Work, as the planner reads it: what it tried, how it ended, and how it was
 * marked. `evaluation` is null until the Job has been scored — a `continuous` round is evaluated a day late.
 */
export interface EarlierJob {
  readonly name: string;
  readonly objective: string;
  readonly orderType: JobOrderType;
  readonly outcomeStatus: JobOutcomeStatus | null;
  readonly outcomeSummary: string | null;
  readonly evaluation: { readonly score: number; readonly whatGood: string; readonly whatBad: string } | null;
}

/**
 * An earlier Unit of Work of the same Strategy: the idea it tested, why, and its Jobs in order.
 */
export interface EarlierUnitOfWork {
  /** e.g. "Attempt 1". */
  readonly name: string;
  /** The idea it tested, e.g. "Long intro, hook at 8 seconds". */
  readonly title: string;
  /** Why the planner chose that idea. */
  readonly rationale: string;
  readonly status: UnitOfWorkStatus;
  readonly jobs: readonly EarlierJob[];
}
