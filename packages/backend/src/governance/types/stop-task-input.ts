/**
 * Stops a Task without completing it — used for both failure and escalation.
 */
export interface StopTaskInput {
  readonly taskId: string;
  readonly reason: string;
}
