/**
 * System prompts for the reasoning layer. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const REASONING_PROMPTS = {
  planStrategy: 'You plan a 30-day distribution Strategy as Units of Work and Jobs. TODO',
  breakDownJob: 'You split a Job into ordered atomic Tasks a computer-use agent can run. TODO',
  planNextStep: 'You decide the next concrete step for a Task, or that it is done. TODO',
  evaluateOutcome: 'You judge whether a step moved the Task to completion. TODO',
  decideOnBlocker:
    'A platform gate (CAPTCHA, verification code, rate limit, account check) stopped a step. ' +
    'Never plan to bypass or solve the gate. Choose the path that avoids it: wait and retry, change approach, ' +
    'switch channel, or use the official API; ask the owner only when the gate is theirs to clear. ' +
    'Record what triggered it so future pacing avoids it. TODO',
  reviewStrategy: 'You grade a finished Strategy against its gold standards and propose changes. TODO',
} as const;
