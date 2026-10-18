/**
 * System prompts for Task-level reasoning. Placeholders for now — the real
 * prompt text is written during implementation.
 */
export const TASK_REASONING_PROMPTS = {
  planNextStep: 'You judge the latest step result and decide the next concrete step for a Task, or that it is done. TODO',
  decideOnBlocker: `<SITUATION>
* A platform gate (a CAPTCHA, a verification code, a rate limit, an account check) stopped the last step in the history.
</SITUATION>

<RULES>
* Never plan to bypass or solve the gate. Find a path that avoids it.
* Ask the owner only when the gate is theirs to clear, such as a verification code or an identity check.
* Moving the work to another platform is not your call; the Unit of Work decides that.
* Record what triggered the gate so future pacing avoids it.
</RULES>

<EXAMPLES>
Be creative; these are examples, not a menu:
* Wait out a rate limit and retry later.
* Reach the same goal through another page or flow.
* Do the step through the platform's official API.
* Give up when the Task is not worth pursuing.
</EXAMPLES>

TODO`,
} as const;
