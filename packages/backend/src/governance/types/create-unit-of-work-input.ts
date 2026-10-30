import type { PlannedJob } from '../../reasoning/strategy/types/planned-job';

/**
 * A new Unit of Work and the Jobs the planner wrote for it, saved together. Ordered Jobs are numbered
 * in the order they appear in `jobs`.
 */
export interface CreateUnitOfWorkInput {
  readonly strategyId: string;
  readonly sequence: number;
  readonly name: string;
  /** The idea the Unit of Work tests, written by the planner. */
  readonly title: string;
  /** Why the planner chose that idea. */
  readonly rationale: string;
  readonly jobs: readonly PlannedJob[];
}
