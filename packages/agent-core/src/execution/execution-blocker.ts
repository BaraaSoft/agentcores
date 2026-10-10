import type { BlockerKind } from './blocker-kind';

/**
 * What stopped an execution run, as reported by the execution model.
 * The reasoning layer uses it to decide: retry later, change approach, switch channel, or ask the owner.
 */
export interface ExecutionBlocker {
  readonly kind: BlockerKind;
  /** One or two sentences: what the gate said and where it appeared. Never contains credentials. */
  readonly detail: string;
}
