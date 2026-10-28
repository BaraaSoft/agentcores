import type { JobOutcomeStatus } from '@ahe/agent-core';
import type { TaskOutcome } from '../../job/types/task-outcome';

/**
 * What the Job the evaluator sent out came back with, having read the owner's own work on their
 * machine. The evaluator asked for this, so once it is here the Job must be marked on it rather than
 * asked about again.
 */
export interface GatheredEvidence {
  /** What that Job was sent to find out. */
  readonly objective: string;
  readonly outcomeStatus: JobOutcomeStatus | null;
  readonly outcomeSummary: string | null;
  readonly tasks: readonly TaskOutcome[];
}
