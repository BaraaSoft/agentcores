/**
 * How an execution run ended.
 * - `done`: the instruction was carried out.
 * - `blocked`: a gate stopped it (CAPTCHA, verification code, rate limit, …); see `ExecutionResult.blocker`.
 *   The reasoning layer decides what happens next — the execution layer never tries to get past one.
 * - `failed`: anything else — step limit hit, cancelled, or the task couldn't be done.
 */
export const EXECUTION_STATUSES = ['done', 'blocked', 'failed'] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
