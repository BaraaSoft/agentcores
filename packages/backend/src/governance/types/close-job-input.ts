import type { JobOutcomeStatus } from '@ahe/agent-core';

/**
 * Closes an open Job with how it ended.
 */
export interface CloseJobInput {
  readonly jobId: string;
  readonly status: JobOutcomeStatus;
  readonly summary: string;
}
