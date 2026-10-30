import { ToolsetFactory } from '../../tools/toolset.factory';
import type { ToolLoopInput } from '../../types/tool-loop-input';
import type { JobReasoningModelClient } from '../job-reasoning-model.client';
import {
  PLAN_TASKS_MAX_TOKENS,
  PLAN_TASKS_MAX_TURNS,
  MAX_TASKS_PER_JOB,
  REVIEW_JOB_MAX_TOKENS,
  TASK_BUDGET_PER_JOB,
} from '../job-reasoning.constants';
import { JobReasoningService } from '../job-reasoning.service';
import { JOB_REVIEW_SCHEMA } from '../schemas/job-review.schema';
import type { JobReview } from '../types/job-review';
import type { TaskOutcome } from '../types/task-outcome';

const JOB = {
  jobName: 'Engage r/AICompanion',
  objective: 'Join the conversation on r/AICompanion',
  unitName: 'Community engagement',
  safeContext: 'Voice: warm, short.',
};

const OPENED: TaskOutcome = {
  action: 'Open r/AICompanion',
  status: 'complete',
  result: { summary: 'Subreddit open; 12 new posts.', metricReadings: { new_posts: 12 }, completedAt: new Date() },
  failureReason: null,
  locationPath: 'reddit.com/r/AICompanion',
  locationDetails: null,
};
const LINK_FAILED: TaskOutcome = {
  action: 'Post the launch link',
  status: 'failed',
  result: null,
  failureReason: 'Links are not allowed',
  locationPath: null,
  locationDetails: null,
};

const REVIEW: JobReview = {
  decision: 'revise',
  rationale: 'Links are banned.',
  revisionNotes: 'Replace the link post with a text-only intro.',
  summary: 'Joined the subreddit.',
};

function setup() {
  const model = { completeStructured: jest.fn(), runToolLoop: jest.fn().mockResolvedValue(undefined) };
  const service = new JobReasoningService(model as unknown as JobReasoningModelClient, new ToolsetFactory());
  const structured = () => model.completeStructured.mock.calls[0][0];
  const loop = (): ToolLoopInput => model.runToolLoop.mock.calls[0][0];
  return { model, service, structured, loop };
}

describe('JobReasoningService', () => {
  describe('reviewJob', () => {
    it('sends the Job, the latest Task apart from earlier ones, and the remaining plan, and returns the review', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(REVIEW);

      const review = await t.service.reviewJob({
        ...JOB,
        latestOutcome: LINK_FAILED,
        history: [OPENED],
        remainingActions: ['Reply to the top thread'],
      });

      expect(review).toEqual(REVIEW);
      const { systemPrompt, userPrompt, schema, maxTokens } = t.structured();
      expect(schema).toBe(JOB_REVIEW_SCHEMA);
      expect(maxTokens).toBe(REVIEW_JOB_MAX_TOKENS);
      expect(systemPrompt).toContain('Do not abandon because Tasks keep failing');
      expect(userPrompt).toContain('Objective: Join the conversation on r/AICompanion');
      expect(userPrompt).toContain('Voice: warm, short.');
      expect(userPrompt).toContain(
        '<LATEST_TASK>\nJust finished: [failed] Post the launch link\n   Failure: Links are not allowed\n</LATEST_TASK>',
      );
      expect(userPrompt).toContain(
        '1. [complete] Open r/AICompanion\n   Result: Subreddit open; 12 new posts.\n   Metrics: new_posts=12\n   Location: reddit.com/r/AICompanion',
      );
      expect(userPrompt).toContain('<REMAINING_PLAN>\n1. Reply to the top thread\n</REMAINING_PLAN>');
    });
  });

  describe('planTasks', () => {
    it('runs the tool loop with the planning tools, the reason, and the Task budget, and returns the edited plan', async () => {
      const t = setup();
      t.model.runToolLoop.mockImplementation(async ({ tools }: ToolLoopInput) => {
        const call = (name: string, input: object) => tools.find((tool) => tool.name === name)!.run(input);
        call('add_task', { action: 'Post a text-only intro', position: 1 });
        call('finish_plan', { rationale: 'Text only.' });
      });

      const actions = await t.service.planTasks({
        ...JOB,
        reason: 'Replace the link post.',
        history: [OPENED, LINK_FAILED],
        remainingActions: ['Reply'],
        tasksStarted: 2,
      });

      expect(actions).toEqual(['Post a text-only intro', 'Reply']);
      const { systemPrompt, userPrompt, maxTokens, maxTurns, tools } = t.loop();
      expect(tools.map((tool) => tool.name)).toEqual([
        'view_plan',
        'add_task',
        'update_task',
        'remove_task',
        'move_task',
        'finish_plan',
      ]);
      expect(maxTokens).toBe(PLAN_TASKS_MAX_TOKENS);
      expect(maxTurns).toBe(PLAN_TASKS_MAX_TURNS);
      expect(systemPrompt).toContain('finish_plan');
      expect(userPrompt).toContain('<WHY_PLANNING>\nReplace the link post.\n</WHY_PLANNING>');
      expect(userPrompt).toContain('2. [failed] Post the launch link');
      expect(userPrompt).toContain('<CURRENT_PLAN>\n1. Reply\n</CURRENT_PLAN>');
      expect(userPrompt).toContain(`2 Tasks started so far, of a soft budget of about ${TASK_BUDGET_PER_JOB}.`);
      expect(systemPrompt).toContain('The budget is guidance, not a wall.');
      expect(systemPrompt).toContain(`hard limit of ${MAX_TASKS_PER_JOB} Tasks per Job`);
      expect(userPrompt).toContain(`Hard limit: ${MAX_TASKS_PER_JOB}, so the plan can hold at most ${MAX_TASKS_PER_JOB - 2} Tasks.`);
    });

    it('gives the planning tools only the room left under the hard limit', async () => {
      const t = setup();
      let refusal: unknown = null;
      t.model.runToolLoop.mockImplementation(async ({ tools }: ToolLoopInput) => {
        const add = tools.find((tool) => tool.name === 'add_task')!;
        await add.run({ action: 'Export', position: null });
        try {
          await add.run({ action: 'Export again', position: null });
        } catch (error) {
          refusal = error;
        }
      });

      const actions = await t.service.planTasks({
        ...JOB,
        reason: 'One more pass.',
        history: [],
        remainingActions: [],
        tasksStarted: MAX_TASKS_PER_JOB - 1,
      });

      expect(actions).toEqual(['Export']);
      expect(String(refusal)).toContain('hard limit leaves room for 1 Tasks');
    });

    it('marks the first plan as having no history and no plan', async () => {
      const t = setup();

      await t.service.planTasks({ ...JOB, reason: 'First plan.', history: [], remainingActions: [], tasksStarted: 0 });

      expect(t.loop().userPrompt).toContain('None — this is the first plan.');
      expect(t.loop().userPrompt).toContain('<CURRENT_PLAN>\nNone.\n</CURRENT_PLAN>');
    });
  });
});
