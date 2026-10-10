import type { BlockerAction } from './blocker-action';

/**
 * The reasoning layer's answer to a blocked step.
 */
export interface BlockerDecision {
  readonly action: BlockerAction;
  readonly rationale: string;
  /** Minutes to wait before retrying; set only for `retry_later`. */
  readonly retryAfterMinutes: number | null;
  /** The question for the owner; set only for `request_owner`. */
  readonly ownerRequest: string | null;
  /** A lesson worth storing, e.g. "reddit.com rate-limits after 3 comments/hour on new accounts". */
  readonly learning: string | null;
}
