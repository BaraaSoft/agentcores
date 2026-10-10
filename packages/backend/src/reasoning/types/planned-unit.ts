import type { Metric } from '@ahe/agent-core';

/**
 * A Unit of Work the reasoning layer proposes for a new Strategy.
 */
export interface PlannedUnit {
  readonly name: string;
  readonly successCriteria: readonly Metric[];
  readonly allocationPercentage: number;
}
