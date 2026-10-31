import type { PlannedTask } from './planned-task';
import type { TaskOutcome } from './task-outcome';

/**
 * What Job reasoning sees when it edits a Job's plan with the planning tools.
 */
export interface JobPlanningInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitOfWorkName: string;
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** Why planning runs: the first plan, the review's revision notes, or an empty plan. */
  readonly reason: string;
  /** Every Task that finished or was dropped (cancelled), in order. Empty for the first plan. */
  readonly history: readonly TaskOutcome[];
  /** The plan being edited: Tasks not started yet, in order. */
  readonly remainingTasks: readonly PlannedTask[];
  /** Tasks of the Job that have started (anything not pending or cancelled), measured against the soft budget. */
  readonly tasksStarted: number;
}
