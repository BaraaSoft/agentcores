/**
 * How a Task run through the harness ended.
 * `deferred` means a temporary gate (e.g. a rate limit) stopped it and it was re-queued for later.
 */
export interface TaskRunOutcome {
  readonly taskId: string;
  readonly status: 'complete' | 'failed' | 'escalated' | 'deferred';
  readonly summary: string;
  readonly iterations: number;
  /** Set only when `status` is `deferred`. */
  readonly retryAfterMinutes: number | null;
}
