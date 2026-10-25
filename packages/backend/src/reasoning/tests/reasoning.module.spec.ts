import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JobReasoningModelClient } from '../job/job-reasoning-model.client';
import { JobReasoningService } from '../job/job-reasoning.service';
import { ReasoningModelClient } from '../reasoning-model.client';
import { ReasoningModule } from '../reasoning.module';
import { StrategyReasoningService } from '../strategy/strategy-reasoning.service';
import { TaskReasoningModelClient } from '../task/task-reasoning-model.client';
import { TaskReasoningService } from '../task/task-reasoning.service';
import { UnitReasoningService } from '../unit-of-work/unit-reasoning.service';

type Wired = { model: { anthropic: unknown; settings: { modelId: string } } };

describe('ReasoningModule', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  async function compile(overrides: Record<string, string>) {
    process.env = { ...env, ANTHROPIC_API_KEY: 'test-key', REASONING_MODEL_ID: 'opus', ...overrides };
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), ReasoningModule],
    }).compile();
    const model = (service: abstract new (...args: never[]) => unknown) => (moduleRef.get(service) as Wired).model;
    return {
      strategy: model(StrategyReasoningService),
      unit: model(UnitReasoningService),
      job: model(JobReasoningService),
      task: model(TaskReasoningService),
    };
  }

  it('gives Job and Task their own model clients over one shared Anthropic instance', async () => {
    const { strategy, unit, job, task } = await compile({ REASONING_JOB_MODEL_ID: 'opus-job', REASONING_TASK_MODEL_ID: 'sonnet' });

    expect(job).toBeInstanceOf(JobReasoningModelClient);
    expect(task).toBeInstanceOf(TaskReasoningModelClient);
    expect(strategy.constructor).toBe(ReasoningModelClient);
    expect([strategy, unit, job, task].map((client) => client.settings.modelId)).toEqual(['opus', 'opus', 'opus-job', 'sonnet']);
    expect(new Set([strategy, unit, job, task].map((client) => client.anthropic)).size).toBe(1);
  });

  it('falls back to REASONING_MODEL_ID when a level has no model of its own', async () => {
    const { job, task } = await compile({ REASONING_JOB_MODEL_ID: '', REASONING_TASK_MODEL_ID: '' });

    expect([job.settings.modelId, task.settings.modelId]).toEqual(['opus', 'opus']);
  });
});
