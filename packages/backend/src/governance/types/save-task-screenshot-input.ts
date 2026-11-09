import type { Screenshot } from '@agentcores/agent-core';

/**
 * The final screen of a Task's latest step, to keep until its Job is evaluated.
 */
export interface SaveTaskScreenshotInput {
  readonly jobId: string;
  readonly taskId: string;
  readonly screenshot: Screenshot;
}
