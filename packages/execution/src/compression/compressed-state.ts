import type { ExecutionBlocker, ExecutionStatus } from '@ahe/agent-core';

/**
 * The text-only view of what happened on screen — the only thing that leaves
 * the execution layer. Replaces 10k+ tokens of image with ~100 words of structured text.
 */
export interface CompressedState {
  readonly status: ExecutionStatus;
  readonly summary: string;
  readonly finalLocation: string;
  readonly blocker: ExecutionBlocker | null;
  readonly metricReadings: Readonly<Record<string, number>>;
}
