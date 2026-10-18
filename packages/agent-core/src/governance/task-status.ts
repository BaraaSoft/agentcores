/**
 * Lifecycle of an atomic Task.
 * `escalated` means the Task stopped because a step needs the owner's judgment or action.
 */
export const TASK_STATUSES = ['pending', 'running', 'complete', 'failed', 'escalated'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
