import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DAILY_REPORT_QUEUE, STRATEGY_EVALUATION_QUEUE, TASK_EXECUTION_QUEUE } from './queue.constants';

const DEFAULT_REDIS_PORT = 6380;
const TASK_RETRY_DELAY_MS = 60_000;
const CYCLE_RETRY_DELAY_MS = 300_000;

/**
 * Sets up the Redis connection, registers every AHE queue with its retry policy,
 * and mounts the Bull Board dashboard at `/admin/queues`.
 * Feature modules still call `BullModule.registerQueue({ name })` for the queues they inject.
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
      { name: TASK_EXECUTION_QUEUE, defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: TASK_RETRY_DELAY_MS } } },
      { name: STRATEGY_EVALUATION_QUEUE, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: CYCLE_RETRY_DELAY_MS } } },
      { name: DAILY_REPORT_QUEUE, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: CYCLE_RETRY_DELAY_MS } } },
    ),
    BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature({ name: TASK_EXECUTION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: STRATEGY_EVALUATION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: DAILY_REPORT_QUEUE, adapter: BullMQAdapter }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
