import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseModule } from './database/database.module';
import { GovernanceModule } from './governance/governance.module';
import { HarnessModule } from './harness/harness.module';
import { IdentityModule } from './identity/identity.module';
import { MemoryModule } from './memory/memory.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { QueueModule } from './queue/queue.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { ReportingModule } from './reporting/reporting.module';
import { StepRouterModule } from './router/step-router.module';
import { WorkflowModule } from './workflow/workflow.module';

/**
 * Root module. Infrastructure first, then the domain modules from the leaves
 * (reasoning, memory, identity, routing, workflow) up to the harness and orchestrator.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    QueueModule,
    ReasoningModule,
    MemoryModule,
    IdentityModule,
    StepRouterModule,
    WorkflowModule,
    GovernanceModule,
    ReportingModule,
    HarnessModule,
    OrchestratorModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
