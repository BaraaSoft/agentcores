import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../queue/queue.constants';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';

/**
 * Workflow start and pause, the Unit of Work lifecycle, and Job scheduling. Produces queue jobs; the
 * job-execution and job-evaluation workers consume them.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: JOB_EXECUTION_QUEUE }, { name: JOB_EVALUATION_QUEUE }),
    WorkflowModule,
    GovernanceModule,
    ReasoningModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}
