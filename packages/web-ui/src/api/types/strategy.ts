import type { StrategyWorkType } from './strategy-work-type';

/** A Strategy, as the Strategy routes return it. */
export interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly workType: StrategyWorkType;
  readonly versionCount: number | null;
  readonly maxAttempts: number;
  readonly status: string;
}
