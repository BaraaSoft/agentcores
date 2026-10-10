/**
 * Lifecycle of an atomic Task.
 * `escalated` means the harness stopped because the step needs human judgment.
 */
export const TASK_STATUSES = ['pending', 'running', 'complete', 'failed', 'escalated'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
