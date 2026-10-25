import type { TaskOutcome } from './task-outcome';

/**
 * What Job reasoning sees when it reviews the Task that just finished.
 */
export interface JobReviewInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitName: string;
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** The Task that just finished (complete or failed) — the one to react to. */
  readonly latestOutcome: TaskOutcome;
  /** Every earlier Task that finished or was dropped (cancelled), in order. */
  readonly history: readonly TaskOutcome[];
  /** Actions planned but not started yet, in order. */
  readonly remainingActions: readonly string[];
}
