import type { TaskOutcome } from './task-outcome';

/**
 * A Job whose Tasks have run, for the reasoning layer to judge against its objective.
 */
export interface EvaluateJobInput {
  readonly jobId: string;
  readonly jobName: string;
  readonly objective: string;
  /** One entry per Task, in order. */
  readonly tasks: readonly TaskOutcome[];
}
