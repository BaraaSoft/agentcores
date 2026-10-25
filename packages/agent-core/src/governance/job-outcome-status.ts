/**
 * How a Job ended.
 * - `success`: its objective was met.
 * - `abandoned`: Job reasoning decided to stop — a strategic signal (wrong place, no longer worth it).
 * - `failed`: it could not be done — an execution signal (repeated failures, ran out of plan or budget).
 */
export const JOB_OUTCOME_STATUSES = ['success', 'abandoned', 'failed'] as const;

export type JobOutcomeStatus = (typeof JOB_OUTCOME_STATUSES)[number];
