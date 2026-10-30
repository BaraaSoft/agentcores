/**
 * Judgement attempts for one Job before the evaluator gives up on it. Below the queue's
 * three deliveries, so the last one records the failure instead of leaving the row stuck in `judging`.
 */
export const MAX_JUDGING_ATTEMPTS = 2;

/** Matches the width of `JobEntity.name`, which the evaluator's suggested name has to fit. */
export const JOB_NAME_MAX_LENGTH = 200;
