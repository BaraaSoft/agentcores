import type { Metric } from '@ahe/agent-core';

/**
 * Data for a new Unit of Work inside a Strategy.
 */
export interface CreateUnitOfWorkInput {
  readonly strategyId: string;
  readonly name: string;
  readonly successCriteria: readonly Metric[];
  readonly allocationPercentage: number;
}
