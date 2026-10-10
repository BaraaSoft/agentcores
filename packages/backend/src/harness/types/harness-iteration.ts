import type { StepRecord } from '../../reasoning/types/step-record';

/**
 * Result of one reason → route → act round. When `isFinished` is true,
 * `outcome` says how the Task ended.
 */
export interface HarnessIteration {
  readonly step: StepRecord | null;
  readonly isFinished: boolean;
  readonly outcome: 'complete' | 'failed' | 'escalated' | 'deferred' | null;
  /** Set only when `outcome` is `deferred`. */
  readonly retryAfterMinutes: number | null;
}
