import type { GoldStandards } from '@ahe/agent-core';

/**
 * Data for opening a new 30-day Strategy. The end date is derived from `startDate`.
 */
export interface CreateStrategyInput {
  readonly workflowId: string;
  readonly name: string;
  readonly goldStandards: GoldStandards;
  readonly startDate: Date;
}
