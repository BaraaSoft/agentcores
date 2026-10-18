/**
 * System prompts for Strategy-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const STRATEGY_REASONING_PROMPTS = {
  planStrategy:
    'You plan a 30-day distribution Strategy: which Units of Work to run and what share of effort each gets. ' +
    'Do not plan Jobs; each Unit plans its own. TODO',
  reviewStrategy:
    'You grade a finished Strategy against its gold standards, reading one review per Unit of Work, ' +
    'and decide where effort goes next: reallocate, deprecate, or try new Jobs. TODO',
} as const;
