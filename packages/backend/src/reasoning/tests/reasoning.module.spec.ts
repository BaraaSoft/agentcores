import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JobReasoningModelClient } from '../job/job-reasoning-model.client';
import { JobReasoningService } from '../job/job-reasoning.service';
import { AnthropicReasoningProvider } from '../providers/anthropic-reasoning.provider';
import { MuseReasoningProvider } from '../providers/muse-reasoning.provider';
import { ReasoningModelClient } from '../reasoning-model.client';
import { ReasoningModule } from '../reasoning.module';
import { StrategyReasoningService } from '../strategy/strategy-reasoning.service';
import { TaskReasoningModelClient } from '../task/task-reasoning-model.client';
import { TaskReasoningService } from '../task/task-reasoning.service';
import type { ReasoningModelSettings } from '../types/reasoning-model-settings';

type Wired = { model: { reasoningProvider: unknown; settings: ReasoningModelSettings } };

const LEVEL_ENV = [
  'REASONING_STRATEGY_PROVIDER',
  'REASONING_STRATEGY_MODEL_ID',
  'REASONING_JOB_PROVIDER',
  'REASONING_JOB_MODEL_ID',
  'REASONING_TASK_PROVIDER',
  'REASONING_TASK_MODEL_ID',
  'META_API_KEY',
];

describe('ReasoningModule', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  async function compile(overrides: Record<string, string>) {
    process.env = { ...env, ANTHROPIC_API_KEY: 'test-key', ...overrides };
    for (const name of LEVEL_ENV) if (!(name in overrides)) delete process.env[name];
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), ReasoningModule],
    }).compile();
    const model = (service: abstract new (...args: never[]) => unknown) => (moduleRef.get(service) as Wired).model;
    return {
      strategy: model(StrategyReasoningService),
      job: model(JobReasoningService),
      task: model(TaskReasoningService),
    };
  }

  it('gives Job and Task their own model clients, sharing one provider per vendor', async () => {
    const { strategy, job, task } = await compile({ REASONING_JOB_MODEL_ID: 'opus-job', REASONING_TASK_MODEL_ID: 'sonnet' });

    expect(job).toBeInstanceOf(JobReasoningModelClient);
    expect(task).toBeInstanceOf(TaskReasoningModelClient);
    expect(strategy.constructor).toBe(ReasoningModelClient);
    expect([strategy, job, task].map((client) => client.settings.modelId)).toEqual(['claude-opus-5-5', 'opus-job', 'sonnet']);
    expect(strategy.reasoningProvider).toBeInstanceOf(AnthropicReasoningProvider);
    expect(new Set([strategy, job, task].map((client) => client.reasoningProvider)).size).toBe(1);
  });

  it('runs Muse Wonder at every level by default, with less effort on the hot Task path', async () => {
    const { strategy, job, task } = await compile({
      META_API_KEY: 'model-key',
      REASONING_STRATEGY_PROVIDER: 'muse',
      REASONING_JOB_PROVIDER: 'muse',
      REASONING_TASK_PROVIDER: 'muse',
    });

    expect([strategy, job, task].map((client) => client.settings.modelId)).toEqual([
      'muse-wonder-1.0',
      'muse-wonder-1.0',
      'muse-wonder-1.0',
    ]);
    expect(task.reasoningProvider).toBeInstanceOf(MuseReasoningProvider);
    expect(task.settings.effort).toBe('medium');
  });

  it('lets each level pick its own provider', async () => {
    const { strategy, task } = await compile({ META_API_KEY: 'model-key', REASONING_STRATEGY_PROVIDER: 'muse' });

    expect(strategy.reasoningProvider).toBeInstanceOf(MuseReasoningProvider);
    expect(task.reasoningProvider).toBeInstanceOf(AnthropicReasoningProvider);
  });

  it('fails at startup when a level uses Muse without a Meta API key', async () => {
    await expect(compile({ REASONING_JOB_PROVIDER: 'muse' })).rejects.toThrow('META_API_KEY is not set');
  });

  it('rejects a provider it does not know', async () => {
    await expect(compile({ REASONING_TASK_PROVIDER: 'openai' })).rejects.toThrow('REASONING_TASK_PROVIDER must be one of');
  });
});
