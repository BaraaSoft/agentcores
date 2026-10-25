/**
 * System prompts for Strategy-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const STRATEGY_REASONING_PROMPTS = {
  planStrategy:
    'You plan a 30-day distribution Strategy: which Units of Work to run and what share of effort each gets. ' +
    'Do not plan Jobs; each Unit plans its own. TODO',
  reviewStrategy: `<SITUATION>
* You grade a finished Strategy against its gold standards, reading one review per Unit of Work.
* Each Unit review reports how its Jobs ended: succeeded, abandoned, or failed.
</SITUATION>

<RULES>
* Decide where effort goes next: reallocate shares, deprecate Units, or try new Jobs.
* Abandoned Jobs are a strategic signal: the work was judged not worth it. A Unit whose Jobs are mostly abandoned is a candidate
  to shrink or deprecate, and its share is better spent elsewhere.
* Failed Jobs are an execution signal: the work could not be done as planned. Keep the Unit's share when its metrics hold up,
  and push for different Jobs; do not deprecate a Unit for execution problems alone.
* Grade on the gold standards; Job outcomes explain the grade, they do not replace it.
</RULES>

TODO`,
} as const;
