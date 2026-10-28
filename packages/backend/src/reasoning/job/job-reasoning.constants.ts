/** Token ceiling for one `reviewJob` call, thinking included. */
export const REVIEW_JOB_MAX_TOKENS = 16_000;

/** Token ceiling for each model turn of `planTasks`, thinking included. */
export const PLAN_TASKS_MAX_TOKENS = 16_000;

/** Model turns `planTasks` may take before giving up; each turn can make several tool calls. */
export const PLAN_TASKS_MAX_TURNS = 15;
