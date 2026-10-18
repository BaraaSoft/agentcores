/**
 * System prompts for Unit-of-Work-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const UNIT_REASONING_PROMPTS = {
  planJobs:
    'You plan the Jobs for one Unit of Work: concrete objectives that move its success metrics, ' +
    'without repeating its existing Jobs. TODO',
  reviewUnit:
    'You review one Unit of Work at the end of a cycle from its measured metrics and its Job evaluations: ' +
    'is it meeting its criteria, why, and should it grow, keep, shrink, or be deprecated. TODO',
} as const;
