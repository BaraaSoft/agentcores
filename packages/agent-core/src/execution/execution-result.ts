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
  /**
   * Where the instruction's work lives: the permalink of what was created or changed, an absolute file
   * path, or the app name for a native app, e.g. "reddit.com/r/AICompanion/comments/abc123". Empty when unknown.
   */
  readonly locationPath: string;
  /** For software views only: very brief steps to reach that view, e.g. "Slack → #launch → thread from @ana". Empty otherwise. */
  readonly locationDetails: string;
  /** Set when `status` is `blocked`; `null` otherwise. */
  readonly blocker: ExecutionBlocker | null;
  readonly stepsTaken: number;
  /** Metric values read off the screen, e.g. upvotes on a post. Empty when none. */
  readonly metricReadings: Readonly<Record<string, number>>;
}
