import { TASK_SKILL_TYPES } from '@ahe/agent-core';
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
  unitOfWorkName: 'Community engagement',
  openSiblingJobs: [{ name: 'Report the replies', objective: 'Write up the replies the intro earned' }],
  finishedSiblingJobs: [],
  safeContext: 'Voice: warm, short.',
};
const OPEN_SIBLING_JOBS_BLOCK = '<OTHER_JOBS_IN_UNIT>\n1. Report the replies: Write up the replies the intro earned\n</OTHER_JOBS_IN_UNIT>';

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
        latestScreenshot: null,
      });

      expect(review).toEqual(REVIEW);
      const { systemPrompt, userPrompt, schema, maxTokens } = t.structured();
      expect(schema).toBe(JOB_REVIEW_SCHEMA);
      expect(maxTokens).toBe(REVIEW_JOB_MAX_TOKENS);
      expect(systemPrompt).toContain('Do not abandon because Tasks keep failing');
      expect(userPrompt).toContain('Objective: Join the conversation on r/AICompanion');
      expect(userPrompt).toContain('Voice: warm, short.');
      expect(userPrompt).toContain(
        '<LATEST_TASK>\nJust finished: [failed] Post the launch link\n   Failure: Links are not allowed\nNo screenshot.\n</LATEST_TASK>',
      );
      expect(userPrompt).toContain(
        '1. [complete] Open r/AICompanion\n   Result: Subreddit open; 12 new posts.\n   Metrics: new_posts=12\n   Location: reddit.com/r/AICompanion',
      );
      expect(userPrompt).toContain('<REMAINING_PLAN>\n1. Reply to the top thread\n</REMAINING_PLAN>');
      expect(t.structured().images).toBeUndefined();
    });

    it("shows the Unit's other open Jobs, and judges the Job against its own objective only", async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(REVIEW);

      await t.service.reviewJob({ ...JOB, latestOutcome: OPENED, history: [], remainingActions: [], latestScreenshot: null });

      const { systemPrompt, userPrompt } = t.structured();
      expect(userPrompt).toContain(OPEN_SIBLING_JOBS_BLOCK);
      expect(systemPrompt).toContain('Judge the Job against its own objective only.');
      expect(systemPrompt).toContain('revise to add their work, and never hold back "met" because their work is not done yet.');
    });

    it('attaches the latest Task screenshot and tells the model it is there', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(REVIEW);
      const screenshot = { mediaType: 'image/png' as const, base64: 'iVBORw0KGgo=' };

      await t.service.reviewJob({ ...JOB, latestOutcome: OPENED, history: [], remainingActions: [], latestScreenshot: screenshot });

      const { images, userPrompt, systemPrompt } = t.structured();
      expect(images).toEqual([screenshot]);
      expect(userPrompt).toContain('The attached screenshot shows the screen as this Task ended.');
      expect(systemPrompt).toContain('judge the work by what it shows');
      expect(systemPrompt).toContain('A piece of work gets one round of improvement inside a Job.');
    });
  });

  describe('planTasks', () => {
    it('runs the tool loop with the planning tools, the reason, and the Task budget, and returns the edited plan', async () => {
      const t = setup();
      t.model.runToolLoop.mockImplementation(async ({ tools }: ToolLoopInput) => {
        const call = (name: string, input: object) => tools.find((tool) => tool.name === name)!.run(input);
        call('add_task', { action: 'Post a text-only intro', skill: 'social_post', position: 1 });
        call('finish_plan', { rationale: 'Text only.' });
      });

      const actions = await t.service.planTasks({
        ...JOB,
        reason: 'Replace the link post.',
        history: [OPENED, LINK_FAILED],
        remainingTasks: [{ action: 'Reply', skillType: 'social_post' }],
        tasksStarted: 2,
        latestScreenshot: null,
      });

      expect(actions).toEqual([
        { action: 'Post a text-only intro', skillType: 'social_post' },
        { action: 'Reply', skillType: 'social_post' },
      ]);
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
      expect(userPrompt).toContain('<CURRENT_PLAN>\n1. [social_post] Reply\n</CURRENT_PLAN>');
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
        await add.run({ action: 'Export', skill: 'general', position: null });
        try {
          await add.run({ action: 'Export again', skill: 'general', position: null });
        } catch (error) {
          refusal = error;
        }
      });

      const actions = await t.service.planTasks({
        ...JOB,
        reason: 'One more pass.',
        history: [],
        remainingTasks: [],
        tasksStarted: MAX_TASKS_PER_JOB - 1,
        latestScreenshot: null,
      });

      expect(actions).toEqual([{ action: 'Export', skillType: 'general' }]);
      expect(String(refusal)).toContain('hard limit leaves room for 1 Tasks');
    });

    it('marks the first plan as having no history and no plan', async () => {
      const t = setup();

      await t.service.planTasks({ ...JOB, reason: 'First plan.', history: [], remainingTasks: [], tasksStarted: 0, latestScreenshot: null });

      expect(t.loop().userPrompt).toContain('None — this is the first plan.');
      expect(t.loop().userPrompt).toContain('<CURRENT_PLAN>\nNone.\n</CURRENT_PLAN>');
      expect(t.loop().images).toBeUndefined();
      expect(t.loop().userPrompt).not.toContain('attached screenshot');
    });

    it("shows the Unit's other open Jobs, and tells the planner to leave their work to them", async () => {
      const t = setup();

      await t.service.planTasks({ ...JOB, reason: 'First plan.', history: [], remainingTasks: [], tasksStarted: 0, latestScreenshot: null });

      expect(t.loop().userPrompt).toContain(OPEN_SIBLING_JOBS_BLOCK);
      expect(t.loop().systemPrompt).toContain('never\n  start their work, even when it looks like the natural next step.');
    });

    it('says None when the Job is the only open Job of its Unit', async () => {
      const t = setup();

      await t.service.planTasks({ ...JOB, openSiblingJobs: [], reason: 'First plan.', history: [], remainingTasks: [], tasksStarted: 0, latestScreenshot: null });

      expect(t.loop().userPrompt).toContain('<OTHER_JOBS_IN_UNIT>\nNone.\n</OTHER_JOBS_IN_UNIT>');
      expect(t.loop().userPrompt).toContain('<FINISHED_JOBS_IN_UNIT>\nNone.\n</FINISHED_JOBS_IN_UNIT>');
    });

    it("shows the Unit's finished Jobs with where their work is, and tells the planner to build on it", async () => {
      const t = setup();

      await t.service.planTasks({
        ...JOB,
        finishedSiblingJobs: [{ name: 'Open the community', outcomes: [OPENED] }],
        reason: 'First plan.',
        history: [],
        remainingTasks: [],
        tasksStarted: 0,
        latestScreenshot: null,
      });

      expect(t.loop().userPrompt).toContain(
        '<FINISHED_JOBS_IN_UNIT>\nOpen the community:\n1. [complete] Open r/AICompanion\n   Result: Subreddit open; 12 new posts.',
      );
      expect(t.loop().userPrompt).toContain('   Location: reddit.com/r/AICompanion\n</FINISHED_JOBS_IN_UNIT>');
      expect(t.loop().systemPrompt).toContain('in this Job or in a finished Job of the Unit, copy that place');
    });

    it('shows the planner the screenshot the review judged, and tells it the screenshot is there', async () => {
      const t = setup();
      const screenshot = { mediaType: 'image/png' as const, base64: 'iVBORw0KGgo=' };

      await t.service.planTasks({
        ...JOB,
        reason: 'Make the headline larger.',
        history: [OPENED],
        remainingTasks: [],
        tasksStarted: 1,
        latestScreenshot: screenshot,
      });

      expect(t.loop().images).toEqual([screenshot]);
      expect(t.loop().userPrompt).toContain(
        'The attached screenshot shows the screen as the latest Task ended: the work as it stands now.\n</TASKS_SO_FAR>',
      );
    });

    it('describes every skill type to the planner, and limits checking Tasks', async () => {
      const t = setup();

      await t.service.planTasks({ ...JOB, reason: 'First plan.', history: [], remainingTasks: [], tasksStarted: 0, latestScreenshot: null });

      const { systemPrompt } = t.loop();
      for (const skillType of TASK_SKILL_TYPES) expect(systemPrompt).toContain(`* ${skillType}: `);
      expect(systemPrompt).toContain('Never plan a Task that only checks earlier work.');
    });
  });

  describe('the review schema', () => {
    it.each([
      ['a revision without notes', { ...REVIEW, revisionNotes: '' }],
      ['a revision with null notes', { ...REVIEW, revisionNotes: null }],
      ['an unknown decision', { ...REVIEW, decision: 'retry' }],
    ])('rejects %s', (_case, answer) => {
      expect(JOB_REVIEW_SCHEMA.safeParse(answer).success).toBe(false);
    });

    it('accepts a decision other than revise without notes', () => {
      expect(JOB_REVIEW_SCHEMA.safeParse({ decision: 'met', rationale: 'Posted.', summary: 'Done.' }).success).toBe(true);
    });
  });
});
