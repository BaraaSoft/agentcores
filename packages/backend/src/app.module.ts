import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseModule } from './database/database.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { GovernanceModule } from './governance/governance.module';
import { JobEvaluationModule } from './governance/processors/job-evaluation/job-evaluation.module';
import { JobExecutionModule } from './governance/processors/job-execution/job-execution.module';
import { TaskExecutionModule } from './governance/processors/task-execution/task-execution.module';
import { IdentityModule } from './identity/identity.module';
import { MemoryModule } from './memory/memory.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { QueueModule } from './queue/queue.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { ReportingModule } from './reporting/reporting.module';
import { WorkflowModule } from './workflow/workflow.module';

/**
 * Root module. Infrastructure first, then the domain modules from the leaves
 * (reasoning, memory, identity, workflow) up to Job and Task execution and the orchestrator, then the
 * REST API on top.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    QueueModule,
    ReasoningModule,
    EmbeddingModule,
    MemoryModule,
    IdentityModule,
    WorkflowModule,
    GovernanceModule,
    ReportingModule,
    JobExecutionModule,
    TaskExecutionModule,
    JobEvaluationModule,
    OrchestratorModule,
    ApiModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
