import type { MemoryRecord } from './memory-record';

/**
 * Owner context that has passed the privacy wall, ready to put in a prompt.
 * This is the only memory shape the reasoning and execution layers ever receive.
 */
export interface SafeContext {
  readonly owner: string;
  readonly records: readonly MemoryRecord[];
  /** The records rendered as a compact prompt block. */
  readonly promptBlock: string;
}
