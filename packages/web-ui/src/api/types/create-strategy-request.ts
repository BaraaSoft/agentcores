import type { StrategyWorkType } from './strategy-work-type';

/** The body of `POST /strategies`. */
export interface CreateStrategyRequest {
  readonly owner: string;
  readonly name: string;
  readonly objective: string;
  readonly workType: StrategyWorkType;
  /** Required for `multi_version`: how many versions to make. */
  readonly versionCount?: number;
  /** For `one_off`: the most attempts before it stops. */
  readonly maxAttempts?: number;
}
