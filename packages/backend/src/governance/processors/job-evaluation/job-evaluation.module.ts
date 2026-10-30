import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import { ReasoningModule } from '../../../reasoning/reasoning.module';
import { GovernanceModule } from '../../governance.module';
import { JobEvaluationProcessor } from './job-evaluation.processor';

/**
 * The worker that marks finished work, one Job at a time, as the orchestrator queues them.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: JOB_EVALUATION_QUEUE }, { name: JOB_EXECUTION_QUEUE }),
    GovernanceModule,
    ReasoningModule,
  ],
  providers: [JobEvaluationProcessor],
})
export class JobEvaluationModule {}
