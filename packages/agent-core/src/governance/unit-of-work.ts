import type { Job } from './job';
import type { UnitOfWorkState } from './unit-of-work-state';
import type { UnitOfWorkStatus } from './unit-of-work-status';

/**
 * One round, attempt, or version of a run's work: a group of Jobs and nothing more. The
 * orchestrator creates it, the planner fills it with Jobs, and it is evaluated as a whole once all its
 * Jobs are closed, so the next Unit can learn from it.
 */
export interface UnitOfWork {
  readonly id: string;
  readonly strategyId: string;
  /** The Workflow (the run) it belongs to. */
  readonly workflowId: string;
  /** 1 for the first Unit of the run, then 2, 3, … */
  readonly sequence: number;
  /** e.g. "Round 3", "Attempt 2", "Version 1". */
  readonly name: string;
  /** The idea it tests, written by the planner, e.g. "Shorter hook, post at 9am". */
  readonly title: string;
  /** Why the planner chose that idea. */
  readonly rationale: string;
  readonly jobs: readonly Job[];
  readonly status: UnitOfWorkStatus;
  /** When its Jobs may be evaluated; null while the Unit is open. */
  readonly evaluateAfter: Date | null;
  readonly state: UnitOfWorkState;
}
