/**
 * What the evaluator concluded about a Job.
 * - `scored`: it could be judged from what is on record, and has been.
 * - `needs_evidence`: the real outcome is not on record yet, so a Job must go and read it.
 */
export const JOB_JUDGEMENT_VERDICTS = ['scored', 'needs_evidence'] as const;

export type JobJudgementVerdict = (typeof JOB_JUDGEMENT_VERDICTS)[number];
