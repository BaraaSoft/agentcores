import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

/**
 * A queue worker that logs every failed delivery with its error and whether the queue tries again.
 * Without it, a thrown error is only kept in Redis and a retry looks like a silent pause.
 */
export abstract class LoggedWorkerHost extends WorkerHost {
  private readonly failureLogger = new Logger(this.constructor.name);

  /** Called by BullMQ when a delivery throws; `job` is missing when the job itself could not be read. */
  @OnWorkerEvent('failed')
  logFailure(job: Job | undefined, error: Error): void {
    const allowed = job?.opts.attempts ?? 1;
    const made = job?.attemptsMade ?? allowed;
    const next = made < allowed ? `it will try again (${made} of ${allowed} tries used)` : 'no tries left';
    this.failureLogger.warn(`Queue job ${job?.id ?? 'unknown'} failed, ${next}: ${error.message}`);
  }
}
