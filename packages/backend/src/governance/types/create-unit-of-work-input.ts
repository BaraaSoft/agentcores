import type { PlannedJob } from '../../reasoning/strategy/types/planned-job';

/**
 * A new Unit of Work and the Jobs the planner wrote for it, saved together. Ordered Jobs are numbered
 * in the order they appear in `jobs`.
 */
export interface CreateUnitOfWorkInput {
  readonly strategyId: string;
  readonly sequence: number;
  readonly name: string;
  readonly jobs: readonly PlannedJob[];
}
