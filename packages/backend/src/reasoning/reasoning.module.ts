import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { EvaluationReasoningService } from './evaluation/evaluation-reasoning.service';
import { JobReasoningModelClient } from './job/job-reasoning-model.client';
import { JobReasoningService } from './job/job-reasoning.service';
import { ReasoningProviders } from './providers/reasoning-providers';
import { ReasoningModelClient } from './reasoning-model.client';
import { reasoningConfig } from './reasoning.config';
import { StrategyReasoningService } from './strategy/strategy-reasoning.service';
import { TaskReasoningModelClient } from './task/task-reasoning-model.client';
import { TaskReasoningService } from './task/task-reasoning.service';
import { ToolsetFactory } from './tools/toolset.factory';

type ReasoningConfig = ConfigType<typeof reasoningConfig>;

/**
 * The reasoning layer: the Strategy planner that writes each Unit's Jobs, Job and Task reasoning, and
 * the evaluator that marks finished work.
 * Each level's model client runs on the reasoning provider its config names (Claude or Muse); levels on
 * the same provider share one SDK instance.
 * A leaf module: other modules call it, it calls no one.
 */
@Module({
  imports: [ConfigModule.forFeature(reasoningConfig)],
  providers: [
    {
      provide: ReasoningProviders,
      inject: [reasoningConfig.KEY],
      useFactory: (config: ReasoningConfig) => new ReasoningProviders(config.apiKeys),
    },
    {
      provide: ReasoningModelClient,
      inject: [ReasoningProviders, reasoningConfig.KEY],
      useFactory: (reasoningProviders: ReasoningProviders, config: ReasoningConfig) =>
        new ReasoningModelClient(reasoningProviders.get(config.strategy.providerName), config.strategy),
    },
    {
      provide: JobReasoningModelClient,
      inject: [ReasoningProviders, reasoningConfig.KEY],
      useFactory: (reasoningProviders: ReasoningProviders, config: ReasoningConfig) =>
        new JobReasoningModelClient(reasoningProviders.get(config.job.providerName), config.job),
    },
    {
      provide: TaskReasoningModelClient,
      inject: [ReasoningProviders, reasoningConfig.KEY],
      useFactory: (reasoningProviders: ReasoningProviders, config: ReasoningConfig) =>
        new TaskReasoningModelClient(reasoningProviders.get(config.task.providerName), config.task),
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
