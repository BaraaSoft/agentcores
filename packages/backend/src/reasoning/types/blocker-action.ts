/**
 * What the reasoning layer can do when the execution layer reports a blocker.
 * - `retry_later`: the gate is likely temporary (rate limit, cooldown); re-queue after a delay.
 * - `change_approach`: try a different path to the same goal (another page, a different flow).
 * - `switch_channel`: move this effort to another platform or Unit of Work.
 * - `use_official_api`: do the step through the platform's API instead of the screen.
 * - `request_owner`: only the account owner can clear it (verification code, identity check); escalate.
 * - `abandon`: not worth pursuing; fail the Task and record why.
 */
export const BLOCKER_ACTIONS = [
  'retry_later',
  'change_approach',
  'switch_channel',
  'use_official_api',
  'request_owner',
  'abandon',
] as const;

export type BlockerAction = (typeof BLOCKER_ACTIONS)[number];
