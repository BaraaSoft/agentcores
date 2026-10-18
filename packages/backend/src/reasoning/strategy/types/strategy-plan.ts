import type { PlannedUnit } from './planned-unit';

/**
 * The reasoning layer's proposal for a fresh 30-day Strategy: its Units of Work and their effort shares.
 * Each Unit's Jobs are planned afterwards, one Unit at a time, by the Unit level.
 */
export interface StrategyPlan {
  readonly name: string;
  readonly units: readonly PlannedUnit[];
}
