import type { GoldStandards } from '@ahe/agent-core';

/**
 * Data for opening a new 30-day Strategy. The end date is derived from `startDate`.
 */
export interface CreateStrategyInput {
  /** HumanExperiences user ID of the person the Strategy acts for. */
  readonly owner: string;
  readonly name: string;
  readonly goldStandards: GoldStandards;
  readonly startDate: Date;
}
