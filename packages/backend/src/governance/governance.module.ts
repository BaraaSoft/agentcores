import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryModule } from '../memory/memory.module';
import { STRATEGY_EVALUATION_QUEUE } from '../queue/queue.constants';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { JobEntity } from './entities/job.entity';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { StrategyEntity } from './entities/strategy.entity';
import { TaskEntity } from './entities/task.entity';
import { UnitOfWorkEntity } from './entities/unit-of-work.entity';
import { StrategyEvaluationProcessor } from './processors/strategy-evaluation.processor';
import { JobService } from './services/job.service';
import { MetricsService } from './services/metrics.service';
import { PlanningService } from './services/planning.service';
import { StrategyEvaluationService } from './services/strategy-evaluation.service';
import { StrategyService } from './services/strategy.service';
import { TaskService } from './services/task.service';
import { UnitOfWorkService } from './services/unit-of-work.service';

/**
 * The operating system of AHE: Strategy → Unit of Work → Job → Task as data,
 * the autonomy rules over it, the metric roll-up, and the monthly review.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyEntity, UnitOfWorkEntity, JobEntity, TaskEntity, MetricSnapshotEntity]),
    BullModule.registerQueue({ name: STRATEGY_EVALUATION_QUEUE }),
    WorkflowModule,
    MemoryModule,
    ReasoningModule,
  ],
  providers: [
    StrategyService,
    UnitOfWorkService,
    JobService,
    TaskService,
    MetricsService,
    PlanningService,
    StrategyEvaluationService,
    StrategyEvaluationProcessor,
  ],
  exports: [StrategyService, UnitOfWorkService, JobService, TaskService, MetricsService, PlanningService],
})
export class GovernanceModule {}
