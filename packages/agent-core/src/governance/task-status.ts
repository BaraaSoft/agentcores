/**
 * Lifecycle of an atomic Task.
 * `escalated` means the Task stopped because a step needs the owner's judgment or action.
 * `deferred` means a temporary gate (e.g. a rate limit) stopped it; a delayed queue item runs it again.
 */
export const TASK_STATUSES = ['pending', 'running', 'complete', 'failed', 'escalated', 'deferred'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
