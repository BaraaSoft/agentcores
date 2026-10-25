import type { TaskOutcome } from './task-outcome';

/**
 * A Job still open at the end of a cycle, for the reasoning layer to judge against its objective.
 * Closed Jobs are not evaluated again; their outcome is already recorded.
 */
export interface EvaluateJobInput {
  readonly jobId: string;
  readonly jobName: string;
  readonly objective: string;
  /** One entry per Task, in order. */
  readonly tasks: readonly TaskOutcome[];
}
