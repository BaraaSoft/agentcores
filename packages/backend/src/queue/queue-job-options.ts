import type { DefaultJobOptions } from 'bullmq';
import { DAILY_REPORT_QUEUE, JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from './queue.constants';

const JOB_RETRY_DELAY_MS = 60_000;
const DAILY_REPORT_RETRY_DELAY_MS = 300_000;
/** A judgement throws on a bad model answer, not a rate limit, so the next try need not wait long. */
const JOB_EVALUATION_RETRY_DELAY_MS = 5_000;

/**
 * Default job options per queue. They live in one place because every module that registers a queue
 * replaces its options: a registration without them silently drops them.
 * - Task runs are never retried: a Task that crashed may already have posted on screen.
 * - Job entries are removed on completion: Job IDs are reused as queue job IDs, and BullMQ ignores
 *   an ID it still holds, so a kept entry would swallow the Job's next review.
 */
export const QUEUE_JOB_OPTIONS = {
  [JOB_EXECUTION_QUEUE]: { attempts: 3, backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS }, removeOnComplete: true },
  [TASK_EXECUTION_QUEUE]: { attempts: 1 },
  [JOB_EVALUATION_QUEUE]: { attempts: 3, backoff: { type: 'exponential', delay: JOB_EVALUATION_RETRY_DELAY_MS } },
  [DAILY_REPORT_QUEUE]: { attempts: 3, backoff: { type: 'exponential', delay: DAILY_REPORT_RETRY_DELAY_MS } },
} as const satisfies Record<string, DefaultJobOptions>;
