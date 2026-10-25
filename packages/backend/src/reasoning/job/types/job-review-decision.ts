/**
 * What Job reasoning decides after a Task finishes.
 * - `continue`: the remaining plan still fits.
 * - `revise`: the plan should change; planning runs with the review's notes.
 * - `met`: the objective is achieved (the Job closes as `success`).
 * - `abandon`: the Job is not worth continuing (closes as `abandoned`, a strategic signal).
 */
export const JOB_REVIEW_DECISIONS = ['continue', 'revise', 'met', 'abandon'] as const;

export type JobReviewDecision = (typeof JOB_REVIEW_DECISIONS)[number];
