import type { JobOutcomeStatus } from '@ahe/agent-core';
import type { TaskOutcome } from '../../job/types/task-outcome';
import type { GatheredEvidence } from './gathered-evidence';

/**
 * One closed Job as the evaluator sees it: what it set out to do, what the whole Strategy is for, and
 * everything its Tasks reported.
 */
export interface JudgeJobInput {
  readonly jobName: string;
  readonly objective: string;
  /** The Strategy's objective: the standard to fall back on when the Job's own objective is vague. */
  readonly strategyObjective: string;
  readonly outcomeStatus: JobOutcomeStatus | null;
  readonly outcomeSummary: string | null;
  /** One entry per Task, in order. */
  readonly tasks: readonly TaskOutcome[];
  /**
   * What an earlier round of evidence came back with, when the evaluator already asked for some.
   * Null the first time round, and the signal not to ask again once set.
   */
  readonly evidence: GatheredEvidence | null;
}
