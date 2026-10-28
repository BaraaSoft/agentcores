/**
 * Where one day's judgement of a Job has got to.
 * - `judging`: waiting to be judged, or being judged right now.
 * - `awaiting_evidence`: parked while a Job it spun up gathers the evidence it asked for.
 * - `scored`: finished — it has a score and its feedback.
 * - `failed`: given up on, after too many evidence rounds or too many errors.
 */
export const JOB_EVALUATION_STATES = ['judging', 'awaiting_evidence', 'scored', 'failed'] as const;

export type JobEvaluationState = (typeof JOB_EVALUATION_STATES)[number];
