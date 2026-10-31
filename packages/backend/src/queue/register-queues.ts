import { BullModule } from '@nestjs/bullmq';
import type { DynamicModule } from '@nestjs/common';
import { QUEUE_JOB_OPTIONS } from './queue-job-options';

type QueueName = keyof typeof QUEUE_JOB_OPTIONS;

/**
 * `BullModule.registerQueue` with each queue's default job options. Every module must register its
 * queues through this, never through `BullModule.registerQueue` directly.
 */
export function registerQueues(...names: readonly QueueName[]): DynamicModule {
  return BullModule.registerQueue(...names.map((name) => ({ name, defaultJobOptions: QUEUE_JOB_OPTIONS[name] })));
}
