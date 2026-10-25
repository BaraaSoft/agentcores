import type { JobReasoningModelClient } from '../job-reasoning-model.client';
import { EVALUATE_JOB_MAX_TOKENS, PLAN_TASKS_MAX_TOKENS } from '../job-reasoning.constants';
import { JobReasoningService } from '../job-reasoning.service';
import { JOB_EVALUATION_OUTPUT_SCHEMA } from '../schemas/job-evaluation-output.schema';
import { JOB_PLAN_SCHEMA } from '../schemas/job-plan.schema';
import type { JobPlan } from '../types/job-plan';
import type { JobReasoningInput } from '../types/job-reasoning-input';

const PLAN: JobPlan = {
  rationale: 'Links are not allowed, so post text only.',
  remainingActions: ['Post a text-only intro'],
  isObjectiveMet: false,
  abandonReason: null,
  summary: 'Joined the subreddit.',
};

const INPUT: JobReasoningInput = {
  jobName: 'Engage r/AICompanion',
  objective: 'Join the conversation on r/AICompanion',
  unitName: 'Community engagement',
  safeContext: 'Voice: warm, short.',
  outcomes: [
    {
      action: 'Open r/AICompanion',
      status: 'complete',
      result: { summary: 'Subreddit open; 12 new posts.', metricReadings: { new_posts: 12 }, completedAt: new Date() },
      failureReason: null,
    },
    { action: 'Post the launch link', status: 'failed', result: null, failureReason: 'Links are not allowed' },
  ],
  remainingActions: ['Reply to the top thread'],
};

function setup() {
  const model = { completeStructured: jest.fn() };
  const service = new JobReasoningService(model as unknown as JobReasoningModelClient);
  const request = () => model.completeStructured.mock.calls[0][0];
  return { model, service, request };
}

describe('JobReasoningService', () => {
  describe('planTasks', () => {
    it('sends the Job, owner context, outcomes, and remaining plan, and returns the plan', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(PLAN);

      expect(await t.service.planTasks(INPUT)).toEqual(PLAN);

      const { userPrompt, systemPrompt, schema, maxTokens } = t.request();
      expect(schema).toBe(JOB_PLAN_SCHEMA);
      expect(maxTokens).toBe(PLAN_TASKS_MAX_TOKENS);
      expect(systemPrompt).toContain('Do not abandon because Tasks keep failing');
      expect(userPrompt).toContain('Objective: Join the conversation on r/AICompanion');
      expect(userPrompt).toContain('Voice: warm, short.');
      expect(userPrompt).toContain('1. [complete] Open r/AICompanion\n   Result: Subreddit open; 12 new posts.\n   Metrics: new_posts=12');
      expect(userPrompt).toContain('2. [failed] Post the launch link\n   Failure: Links are not allowed');
      expect(userPrompt).toContain('<REMAINING_PLAN>\n1. Reply to the top thread\n</REMAINING_PLAN>');
    });

    it('marks the first plan as having no outcomes and no remaining Tasks', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(PLAN);

      await t.service.planTasks({ ...INPUT, outcomes: [], remainingActions: [] });

      expect(t.request().userPrompt).toContain('None yet — this is the first plan.');
      expect(t.request().userPrompt).toContain('<REMAINING_PLAN>\nNone.\n</REMAINING_PLAN>');
    });
  });

  it('evaluates an open Job and returns it with no outcome', async () => {
    const t = setup();
    t.model.completeStructured.mockResolvedValue({ summary: 'Half done.', followUpActions: ['Reply to the top thread'] });

    const evaluation = await t.service.evaluateJob({
      jobId: 'job-1',
      jobName: INPUT.jobName,
      objective: INPUT.objective,
      tasks: INPUT.outcomes,
    });

    expect(evaluation).toEqual({
      jobId: 'job-1',
      jobName: 'Engage r/AICompanion',
      outcomeStatus: null,
      summary: 'Half done.',
      followUpActions: ['Reply to the top thread'],
    });
    expect(t.request()).toEqual(expect.objectContaining({ schema: JOB_EVALUATION_OUTPUT_SCHEMA, maxTokens: EVALUATE_JOB_MAX_TOKENS }));
    expect(t.request().userPrompt).toContain('2. [failed] Post the launch link');
  });
});
