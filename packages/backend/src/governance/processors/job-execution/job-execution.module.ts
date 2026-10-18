import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import { GovernanceModule } from '../../governance.module';
import { JobExecutionProcessor } from './job-execution.processor';

/**
 * Job level of governance: the worker that breaks a Job into Tasks and starts them, one at a time.
 */
@Module({
  imports: [BullModule.registerQueue({ name: JOB_EXECUTION_QUEUE }, { name: TASK_EXECUTION_QUEUE }), GovernanceModule],
  providers: [JobExecutionProcessor],
})
export class JobExecutionModule {}
