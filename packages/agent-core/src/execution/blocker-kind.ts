/**
 * Kinds of gate that can stop an execution run.
 * - `captcha`: a "prove you're human" challenge.
 * - `verification_code`: an emailed / SMS / authenticator code is asked for.
 * - `identity_check`: "verify it's you", phone confirmation, or similar account check.
 * - `login_required`: signed out and no credentials were supplied, or they were rejected.
 * - `rate_limited`: "you're doing that too much", posting cooldowns, temporary blocks.
 * - `account_restricted`: suspended, shadow-limited, or flagged account.
 * - `other`: any other gate the instruction can't pass.
 */
export const BLOCKER_KINDS = [
  'captcha',
  'verification_code',
  'identity_check',
  'login_required',
  'rate_limited',
  'account_restricted',
  'other',
] as const;

export type BlockerKind = (typeof BLOCKER_KINDS)[number];
