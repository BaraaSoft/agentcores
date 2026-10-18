/**
 * How one run of a Task ended.
 * - `complete`: the Task is done; the Job's next Task is queued.
 * - `failed`: it could not be done, hit the iteration limit, or was refused (sealed topic).
 * - `escalated`: it needs the owner; the Job waits until the owner answers.
 * - `deferred`: a temporary gate (e.g. a rate limit) stopped it; it was re-queued for later.
 */
export interface TaskRunOutcome {
  readonly taskId: string;
  readonly status: 'complete' | 'failed' | 'escalated' | 'deferred';
  readonly summary: string;
  /** Steps sent to the execution layer. */
  readonly iterations: number;
  /** Set only when `status` is `deferred`. */
  readonly retryAfterMinutes: number | null;
}
