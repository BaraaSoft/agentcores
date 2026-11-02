import type { StrategyWorkType } from './strategy-work-type';

/** A Strategy, as the Strategy routes return it. */
export interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly workType: StrategyWorkType;
  readonly versionCount: number | null;
  readonly maxAttempts: number;
  readonly status: 'active' | 'complete';
  /** ISO time the Strategy started. */
  readonly startDate: string;
  /** ISO time the Strategy completed, or null while it is active. */
  readonly endDate: string | null;
}
