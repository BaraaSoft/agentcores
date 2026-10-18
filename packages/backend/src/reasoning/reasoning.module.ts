import { Module } from '@nestjs/common';
import { JobReasoningService } from './job/job-reasoning.service';
import { ReasoningModelClient } from './reasoning-model.client';
import { StrategyReasoningService } from './strategy/strategy-reasoning.service';
import { TaskReasoningService } from './task/task-reasoning.service';
import { UnitReasoningService } from './unit-of-work/unit-reasoning.service';

/**
 * The reasoning layer (Opus), one service per governance level: Strategy, Unit of Work, Job, Task.
 * They share one model client. A leaf module: other modules call it, it calls no one.
 */
@Module({
  providers: [ReasoningModelClient, StrategyReasoningService, UnitReasoningService, JobReasoningService, TaskReasoningService],
  exports: [StrategyReasoningService, UnitReasoningService, JobReasoningService, TaskReasoningService],
})
export class ReasoningModule {}
