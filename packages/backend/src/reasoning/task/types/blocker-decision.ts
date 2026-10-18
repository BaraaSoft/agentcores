import type { PlannedStep } from './planned-step';

/**
 * The reasoning layer's answer to a blocked step. How to work around the gate is open-ended;
 * the fields only tell the Task processor what happens to the Task. Checked in this order:
 * `ownerRequest` escalates, `retryAfterMinutes` defers, `nextStep` continues, none of them fails the Task.
 */
export interface BlockerDecision {
  /** How the gate is being handled and why, in the model's own words. */
  readonly rationale: string;
  /** The step that works around the gate; `null` when the Task should not continue now. */
  readonly nextStep: PlannedStep | null;
  /** Minutes to wait before the Task is re-queued; `null` when not deferring. */
  readonly retryAfterMinutes: number | null;
  /** The question for the owner, for gates only they can clear; `null` when not escalating. */
  readonly ownerRequest: string | null;
  /** A lesson worth storing, e.g. "reddit.com rate-limits after 3 comments/hour on new accounts". */
  readonly learning: string | null;
}
