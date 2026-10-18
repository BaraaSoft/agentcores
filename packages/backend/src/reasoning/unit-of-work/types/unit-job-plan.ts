import type { PlannedJob } from './planned-job';

/**
 * The Jobs the reasoning layer proposes for one Unit of Work.
 */
export interface UnitJobPlan {
  readonly jobs: readonly PlannedJob[];
}
