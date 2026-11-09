import type { StrategyWorkType } from '@agentcores/agent-core';

/**
 * Data for opening a new Strategy, as the owner defines it.
 */
export interface CreateStrategyInput {
  /** HumanExperiences user ID of the person the Strategy acts for. */
  readonly owner: string;
  readonly name: string;
  readonly objective: string;
  readonly workType: StrategyWorkType;
  /** Required for `multi_version`; ignored for the other work types. */
  readonly versionCount?: number;
  /** For `one_off`; defaults to 3. */
  readonly maxAttempts?: number;
  /** Defaults to now. */
  readonly startDate?: Date;
}
