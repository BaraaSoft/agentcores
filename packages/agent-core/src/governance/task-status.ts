/**
 * Lifecycle of an atomic Task.
 * `escalated` means the Task stopped because a step needs the owner's judgment or action.
 * `deferred` means a temporary gate (e.g. a rate limit) stopped it; a delayed queue item runs it again.
 * `cancelled` means Job reasoning dropped it from the plan before it ran.
 */
export const TASK_STATUSES = ['pending', 'running', 'complete', 'failed', 'escalated', 'deferred', 'cancelled'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
