/** Safe-memory records given to Job reasoning when it plans or reviews a Job. */
export const JOB_CONTEXT_RECORD_LIMIT = 8;

/** Failed Tasks in a row after which the Job closes as failed, whatever Job reasoning plans. */
export const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Job review attempts in a row (queue retries included) that may fail before the Job closes as
 * failed. Without it, a Job whose review keeps throwing stays startable and is retried every pass.
 */
export const MAX_REVIEWING_ATTEMPTS = 6;
