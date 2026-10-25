import type { TaskOutcome } from './task-outcome';

/**
 * What Job reasoning sees when it plans: the objective, how the Tasks so far ended, and what is still
 * planned. Both lists are empty for the first plan.
 */
export interface JobReasoningInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitName: string;
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** Finished Tasks in order (complete, failed); the last one is the result to react to. */
  readonly outcomes: readonly TaskOutcome[];
  /** Actions planned but not started yet, in order. */
  readonly remainingActions: readonly string[];
}
