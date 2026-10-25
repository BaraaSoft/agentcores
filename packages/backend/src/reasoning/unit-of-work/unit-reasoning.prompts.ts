/**
 * System prompts for Unit-of-Work-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const UNIT_REASONING_PROMPTS = {
  planJobs:
    'You plan the Jobs for one Unit of Work: concrete objectives that move its success metrics, ' +
    'without repeating its existing Jobs. TODO',
  reviewUnit: `<SITUATION>
* You review one Unit of Work at the end of a cycle from its measured metrics and one evaluation per Job.
* Each Job ended as success, abandoned, or failed, or was still open (no outcome) when the cycle ended.
</SITUATION>

<RULES>
* Read abandoned and failed differently:
  - abandoned means Job reasoning decided to stop: the Job was not worth pursuing. It is a strategic signal about this Unit.
    Many abandoned Jobs point to the Unit itself — wrong place, wrong audience — and argue for shrinking or deprecating it.
  - failed means the Job could not be done: repeated Task failures or no workable plan. It is an execution signal.
    Failed Jobs argue for different Jobs or approaches inside the Unit, not against the Unit, unless the metrics also fall short.
* Judge the Unit on its metrics first; Job outcomes explain why the metrics moved or did not.
* Say in the summary how many Jobs succeeded, were abandoned, and failed, and the reasons behind the abandoned ones.
* Propose new Jobs that avoid what made earlier Jobs fail or get abandoned.
</RULES>

TODO`,
} as const;
