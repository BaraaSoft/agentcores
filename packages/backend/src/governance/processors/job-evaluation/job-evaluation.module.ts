import { Module } from '@nestjs/common';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import { registerQueues } from '../../../queue/register-queues';
import { ReasoningModule } from '../../../reasoning/reasoning.module';
import { GovernanceModule } from '../../governance.module';
import { JobEvaluationProcessor } from './job-evaluation.processor';

/**
 * The worker that marks finished work, one Job at a time, as the orchestrator queues them.
 */
@Module({
  imports: [
    registerQueues(JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE),
    GovernanceModule,
    ReasoningModule,
  ],
  providers: [JobEvaluationProcessor],
})
export class JobEvaluationModule {}
