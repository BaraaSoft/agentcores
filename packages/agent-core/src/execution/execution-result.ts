import type { ExecutionBlocker } from './execution-blocker';
import type { ExecutionStatus } from './execution-status';

/**
 * What the execution layer returns to the backend's Task processor after the loop ends.
 * Only this text is ever forwarded to the reasoning layer — screenshots never are.
 */
export interface ExecutionResult {
  readonly status: ExecutionStatus;
  /** Compressed description of the final state relevant to the instruction (≤ ~100 words). */
  readonly summary: string;
  /** App and page the screen ended on, e.g. "Chrome — reddit.com/r/AICompanion". Empty when unknown. */
  readonly finalLocation: string;
  /** Set when `status` is `blocked`; `null` otherwise. */
  readonly blocker: ExecutionBlocker | null;
  readonly stepsTaken: number;
  /** Metric values read off the screen, e.g. upvotes on a post. Empty when none. */
  readonly metricReadings: Readonly<Record<string, number>>;
}
