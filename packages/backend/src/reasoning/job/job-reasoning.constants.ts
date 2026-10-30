/** Token ceiling for one `reviewJob` call, thinking included. */
export const REVIEW_JOB_MAX_TOKENS = 16_000;

/** Token ceiling for each model turn of `planTasks`, thinking included. */
export const PLAN_TASKS_MAX_TOKENS = 16_000;

/** Model turns `planTasks` may take before giving up; each turn can make several tool calls. */
export const PLAN_TASKS_MAX_TURNS = 15;

/**
 * Soft budget of Tasks for one Job, started and planned together. Job reasoning sees it as guidance
 * and may go over it when the objective genuinely needs more; nothing enforces it.
 */
export const TASK_BUDGET_PER_JOB = 20;

/** Soft guide for how many Tasks one revision adds beyond the remaining plan. */
export const TASKS_ADDED_PER_REVISION = 5;

/**
 * Hard limit of Tasks one Job may start, far above the soft budget so it only catches a runaway Job:
 * one whose Tasks keep succeeding while the objective is never met. The planning tools refuse a plan
 * that would pass it, and the Job processor closes a Job that reaches it as failed.
 */
export const MAX_TASKS_PER_JOB = TASK_BUDGET_PER_JOB * 3;
