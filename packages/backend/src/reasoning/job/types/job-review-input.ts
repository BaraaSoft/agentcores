import type { Screenshot } from '@agentcores/agent-core';
import type { FinishedSiblingJob } from './finished-sibling-job';
import type { OpenSiblingJob } from './open-sibling-job';
import type { TaskOutcome } from './task-outcome';

/**
 * What Job reasoning sees when it reviews the Task that just finished.
 */
export interface JobReviewInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitOfWorkName: string;
  /** The Unit's other Jobs that have not closed yet. The review never asks this Job to do their work. */
  readonly openSiblingJobs: readonly OpenSiblingJob[];
  /** The Unit's other Jobs that have closed, with what they made and where. */
  readonly finishedSiblingJobs: readonly FinishedSiblingJob[];
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** The Task that just finished (complete or failed) — the one to react to. */
  readonly latestOutcome: TaskOutcome;
  /** Every earlier Task that finished or was dropped (cancelled), in order. */
  readonly history: readonly TaskOutcome[];
  /** Actions planned but not started yet, in order. */
  readonly remainingActions: readonly string[];
  /** The screen as the latest Task ended, when its skill returns screenshots; otherwise null. */
  readonly latestScreenshot: Screenshot | null;
}
