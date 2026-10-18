/**
 * System prompts for Job-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const JOB_REASONING_PROMPTS = {
  breakDownJob: 'You split a Job into ordered atomic Tasks a computer-use agent can run. TODO',
  evaluateJob:
    'You judge whether a Job met its objective from the outcomes of its Tasks, ' +
    'and name any follow-up Tasks that would finish it. TODO',
} as const;
