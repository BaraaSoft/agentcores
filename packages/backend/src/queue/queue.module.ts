import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DAILY_REPORT_QUEUE, JOB_EXECUTION_QUEUE, STRATEGY_EVALUATION_QUEUE, TASK_EXECUTION_QUEUE } from './queue.constants';

const DEFAULT_REDIS_PORT = 6380;
const JOB_RETRY_DELAY_MS = 60_000;
const CYCLE_RETRY_DELAY_MS = 300_000;

/**
 * Sets up the Redis connection, registers every AHE queue with its retry policy,
 * and mounts the Bull Board dashboard at `/admin/queues`.
 * Feature modules still call `BullModule.registerQueue({ name })` for the queues they inject.
 *
 * Task runs are never retried by the queue: a Task that crashed may already have posted on screen.
 * Job queue entries are removed on completion, because the orchestrator reuses Job IDs as
 * queue job IDs and BullMQ ignores an ID it still holds.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? DEFAULT_REDIS_PORT,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: JOB_EXECUTION_QUEUE,
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS }, removeOnComplete: true },
      },
      { name: TASK_EXECUTION_QUEUE, defaultJobOptions: { attempts: 1 } },
      { name: STRATEGY_EVALUATION_QUEUE, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: CYCLE_RETRY_DELAY_MS } } },
      { name: DAILY_REPORT_QUEUE, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: CYCLE_RETRY_DELAY_MS } } },
    ),
    BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature({ name: JOB_EXECUTION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: TASK_EXECUTION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: STRATEGY_EVALUATION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: DAILY_REPORT_QUEUE, adapter: BullMQAdapter }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
