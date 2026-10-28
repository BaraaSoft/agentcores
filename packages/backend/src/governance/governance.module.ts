import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingModule } from '../embedding/embedding.module';
import { STRATEGY_EVALUATION_QUEUE } from '../queue/queue.constants';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { JobEvaluationEntity } from './entities/job-evaluation.entity';
import { JobEntity } from './entities/job.entity';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { StrategyEntity } from './entities/strategy.entity';
import { TaskEntity } from './entities/task.entity';
import { UnitOfWorkEntity } from './entities/unit-of-work.entity';
import { StrategyEvaluationProcessor } from './processors/strategy-evaluation.processor';
import { JobEvaluationService } from './services/job-evaluation.service';
import { JobService } from './services/job.service';
import { MetricsService } from './services/metrics.service';
import { StrategyEvaluationService } from './services/strategy-evaluation.service';
import { StrategyService } from './services/strategy.service';
import { TaskService } from './services/task.service';
import { UnitOfWorkService } from './services/unit-of-work.service';

/**
 * The operating system of AHE: Strategy → Unit of Work → Job → Task as data,
 * the autonomy rules over it, the metric roll-up, the marks its own work is given, and the monthly review.
 * Each level that runs work has its own folder and module under `processors/`
 * (`job-execution/`, `task-execution/`, `job-evaluation/`).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyEntity, UnitOfWorkEntity, JobEntity, TaskEntity, MetricSnapshotEntity, JobEvaluationEntity]),
    BullModule.registerQueue({ name: STRATEGY_EVALUATION_QUEUE }),
    WorkflowModule,
    ReasoningModule,
    EmbeddingModule,
  ],
  providers: [
    StrategyService,
    UnitOfWorkService,
    JobService,
    TaskService,
    JobEvaluationService,
    MetricsService,
    StrategyEvaluationService,
    StrategyEvaluationProcessor,
  ],
  exports: [StrategyService, UnitOfWorkService, JobService, TaskService, JobEvaluationService, MetricsService],
})
export class GovernanceModule {}
