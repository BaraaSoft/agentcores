/**
 * Job reasoning's decision after looking at the Job: the plan for everything not started yet,
 * or that the Job is over.
 * - Objective met → `isObjectiveMet` (the Job closes as `success`).
 * - Decided to stop → `abandonReason` (closes as `abandoned`: a strategic call, not an execution failure).
 * - Otherwise → `remainingActions`: the same list to continue, or an edited one (added, dropped,
 *   reordered, or replaced Tasks). An empty list with no reason means it ran out of ideas (closes as `failed`).
 */
export interface JobPlan {
  readonly rationale: string;
  /** Replaces every Task not started yet. Ignored when the objective is met or the Job is abandoned. */
  readonly remainingActions: readonly string[];
  readonly isObjectiveMet: boolean;
  readonly abandonReason: string | null;
  /** How the Job ended or stands, in a few sentences; becomes the Job's outcome summary when it closes. */
  readonly summary: string;
}
