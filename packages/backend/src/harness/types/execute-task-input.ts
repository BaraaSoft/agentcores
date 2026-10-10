/**
 * Which Task the harness should run.
 */
export interface ExecuteTaskInput {
  readonly taskId: string;
  /** Aborts the computer-use loop, e.g. when the Workflow is paused mid-Task. */
  readonly signal?: AbortSignal;
}
