import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DAILY_REPORT_QUEUE,
  JOB_EVALUATION_QUEUE,
  JOB_EXECUTION_QUEUE,
  TASK_EXECUTION_QUEUE,
} from './queue.constants';
import { registerQueues } from './register-queues';

const DEFAULT_REDIS_PORT = 6380;

/**
 * Sets up the Redis connection, registers every AHE queue with its job options (see
 * `QUEUE_JOB_OPTIONS`), and mounts the Bull Board dashboard at `/admin/queues`.
 * Feature modules register the queues they inject with `registerQueues` too.
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
    registerQueues(JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE, DAILY_REPORT_QUEUE, JOB_EVALUATION_QUEUE),
    BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature({ name: JOB_EXECUTION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: TASK_EXECUTION_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: DAILY_REPORT_QUEUE, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: JOB_EVALUATION_QUEUE, adapter: BullMQAdapter }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
