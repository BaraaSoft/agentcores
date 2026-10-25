import type { TaskOutcome } from './task-outcome';

/**
 * What Job reasoning sees when it edits a Job's plan with the planning tools.
 */
export interface JobPlanningInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitName: string;
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** Why planning runs: the first plan, the review's revision notes, or an empty plan. */
  readonly reason: string;
  /** Every Task that finished or was dropped (cancelled), in order. Empty for the first plan. */
  readonly history: readonly TaskOutcome[];
  /** The plan being edited: actions not started yet, in order. */
  readonly remainingActions: readonly string[];
  /** Most Tasks the plan may hold when it is finished. */
  readonly maxTasks: number;
}
