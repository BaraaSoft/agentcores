import type { StepRecord } from './step-record';

/**
 * Everything Task-level reasoning reads; every method takes this same shape.
 * `history` ends with the latest executed step, so a blocked step is its last entry.
 */
export interface TaskReasoningInput {
  readonly taskAction: string;
  readonly jobObjective: string;
  readonly safeContext: string;
  readonly history: readonly StepRecord[];
  /** Gates this account hit in the last 24 hours, so pacing can back off before a pattern forms. */
  readonly recentChallengeCount: number;
}
