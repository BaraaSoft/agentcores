import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { TASK_EXECUTION_QUEUE } from '../../queue/queue.constants';
import type { TaskExecutionJobData } from '../../queue/types/task-execution-job-data';
import { HarnessService } from '../harness.service';

/**
 * BullMQ worker that feeds Tasks into the harness. Concurrency is 1: there is
 * one screen and one mouse on the Mac Mini, so on-screen work must run one Task at a time.
 */
@Processor(TASK_EXECUTION_QUEUE, { concurrency: 1 })
export class TaskExecutionProcessor extends WorkerHost {
  constructor(private readonly harness: HarnessService) {
    super();
  }

  /**
   * Runs the queued Task through the harness.
   */
  async process(job: Job<TaskExecutionJobData>): Promise<void> {
    throw new Error('Not implemented');
  }
}
