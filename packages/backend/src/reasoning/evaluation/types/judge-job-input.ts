import type { JobOutcomeStatus, Metric } from '@ahe/agent-core';
import type { TaskOutcome } from '../../job/types/task-outcome';
import type { GatheredEvidence } from './gathered-evidence';

/**
 * One Job as the evaluator sees it: what it set out to do, the standard it is held to, and
 * everything its Tasks reported. Open and closed Jobs are both judged — work that finished days ago
 * keeps attracting engagement — so `outcomeStatus` is null while the Job is still running.
 */
export interface JudgeJobInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitName: string;
  /** The Unit's success criteria: the closest thing the Job has to a stated standard. */
  readonly successCriteria: readonly Metric[];
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
