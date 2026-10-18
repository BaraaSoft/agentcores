import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { DAILY_REPORT_QUEUE, JOB_EXECUTION_QUEUE, STRATEGY_EVALUATION_QUEUE } from '../queue/queue.constants';
import { WorkflowModule } from '../workflow/workflow.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';

/**
 * Workflow lifecycle and Job scheduling. Produces queue jobs; the governance
 * (job-execution, strategy-evaluation) and reporting workers consume them.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: JOB_EXECUTION_QUEUE },
      { name: DAILY_REPORT_QUEUE },
      { name: STRATEGY_EVALUATION_QUEUE },
    ),
    WorkflowModule,
    GovernanceModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}
