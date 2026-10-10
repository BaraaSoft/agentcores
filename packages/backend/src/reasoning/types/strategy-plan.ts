import type { PlannedJob } from './planned-job';
import type { PlannedUnit } from './planned-unit';

/**
 * The reasoning layer's proposal for a fresh 30-day Strategy: its Units and first Jobs.
 */
export interface StrategyPlan {
  readonly name: string;
  readonly units: readonly PlannedUnit[];
  readonly jobs: readonly PlannedJob[];
}
