import type { Job } from './job';
import type { Metric } from './metric';
import type { UnitOfWorkState } from './unit-of-work-state';

/**
 * A theme of related Jobs (e.g. "Reddit Community Presence") with its own
 * success criteria, measured daily. Only created when a Job fits no existing Unit.
 */
export interface UnitOfWork {
  readonly id: string;
  readonly strategyId: string;
  readonly name: string;
  readonly successCriteria: readonly Metric[];
  readonly jobs: readonly Job[];
  /** Share of the Strategy's effort, 0–100. All active Units sum to 100. */
  readonly allocationPercentage: number;
  readonly state: UnitOfWorkState;
  readonly isDeprecated: boolean;
}
