import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { JobReasoningModelClient } from './job/job-reasoning-model.client';
import { JobReasoningService } from './job/job-reasoning.service';
import { ReasoningModelClient } from './reasoning-model.client';
import { reasoningConfig } from './reasoning.config';
import { ANTHROPIC_CLIENT } from './reasoning.tokens';
import { StrategyReasoningService } from './strategy/strategy-reasoning.service';
import { TaskReasoningModelClient } from './task/task-reasoning-model.client';
import { TaskReasoningService } from './task/task-reasoning.service';
import { ToolsetFactory } from './tools/toolset.factory';
import { UnitReasoningService } from './unit-of-work/unit-reasoning.service';

type ReasoningConfig = ConfigType<typeof reasoningConfig>;

/**
 * The reasoning layer, one service per governance level: Strategy, Unit of Work, Job, Task.
 * One Anthropic instance is shared; each level's model client wraps it with that level's model.
 * A leaf module: other modules call it, it calls no one.
 */
@Module({
  imports: [ConfigModule.forFeature(reasoningConfig)],
  providers: [
    {
      provide: ANTHROPIC_CLIENT,
      inject: [reasoningConfig.KEY],
      useFactory: (config: ReasoningConfig) => new Anthropic({ apiKey: config.apiKey }),
    },
    {
      provide: ReasoningModelClient,
      inject: [ANTHROPIC_CLIENT, reasoningConfig.KEY],
      useFactory: (anthropic: Anthropic, config: ReasoningConfig) => new ReasoningModelClient(anthropic, config.defaultModel),
    },
    {
      provide: JobReasoningModelClient,
      inject: [ANTHROPIC_CLIENT, reasoningConfig.KEY],
      useFactory: (anthropic: Anthropic, config: ReasoningConfig) => new JobReasoningModelClient(anthropic, config.jobModel),
    },
    {
      provide: TaskReasoningModelClient,
      inject: [ANTHROPIC_CLIENT, reasoningConfig.KEY],
      useFactory: (anthropic: Anthropic, config: ReasoningConfig) => new TaskReasoningModelClient(anthropic, config.taskModel),
    },
    ToolsetFactory,
    StrategyReasoningService,
    UnitReasoningService,
    JobReasoningService,
    TaskReasoningService,
  ],
  exports: [StrategyReasoningService, UnitReasoningService, JobReasoningService, TaskReasoningService],
})
export class ReasoningModule {}
