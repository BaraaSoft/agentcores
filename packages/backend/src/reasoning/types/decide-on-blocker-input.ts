import type { ExecutionBlocker } from '@ahe/agent-core';
import type { StepRecord } from './step-record';

/**
 * Context for deciding what to do about a blocked step.
 */
export interface DecideOnBlockerInput {
  readonly taskAction: string;
  readonly jobObjective: string;
  readonly platform: string | null;
  readonly blocker: ExecutionBlocker;
  /** The Task's steps so far, ending with the blocked one. */
  readonly history: readonly StepRecord[];
  /** Gates this account hit in the last 24 hours, so a pattern can be spotted early. */
  readonly recentChallengeCount: number;
}
