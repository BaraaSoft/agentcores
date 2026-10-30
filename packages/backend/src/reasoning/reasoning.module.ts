import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { EvaluationReasoningService } from './evaluation/evaluation-reasoning.service';
import { JobReasoningModelClient } from './job/job-reasoning-model.client';
import { JobReasoningService } from './job/job-reasoning.service';
import { ReasoningModelClient } from './reasoning-model.client';
import { reasoningConfig } from './reasoning.config';
import { ANTHROPIC_CLIENT } from './reasoning.tokens';
import { StrategyReasoningService } from './strategy/strategy-reasoning.service';
import { TaskReasoningModelClient } from './task/task-reasoning-model.client';
import { TaskReasoningService } from './task/task-reasoning.service';
import { ToolsetFactory } from './tools/toolset.factory';

type ReasoningConfig = ConfigType<typeof reasoningConfig>;

/**
 * The reasoning layer: the Strategy planner that writes each Unit's Jobs, Job and Task reasoning, and
 * the evaluator that marks finished work.
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
    JobReasoningService,
    TaskReasoningService,
    EvaluationReasoningService,
  ],
  exports: [StrategyReasoningService, JobReasoningService, TaskReasoningService, EvaluationReasoningService],
})
export class ReasoningModule {}
