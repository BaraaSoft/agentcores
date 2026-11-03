import type { ExecutionResult } from '@ahe/agent-core';
import { PLANNED_STEP_SCHEMA } from '../schemas/planned-step.schema';
import { CREATIVE_DESIGN_SKILL, GENERAL_SKILL, renderTaskSkillPrompt } from '../skills';
import type { TaskReasoningModelClient } from '../task-reasoning-model.client';
import { PLAN_NEXT_STEP_MAX_TOKENS } from '../task-reasoning.constants';
import { TaskReasoningService } from '../task-reasoning.service';
import type { TaskReasoningInput } from '../types/task-reasoning-input';

const RESULT: ExecutionResult = {
  status: 'done',
  summary: 'Top post: "Local-first AI" with 412 upvotes.',
  locationPath: 'reddit.com/r/AICompanion/top',
  locationDetails: '',
  blocker: null,
  stepsTaken: 6,
  metricReadings: { upvotes: 412 },
};

const INPUT: TaskReasoningInput = {
  taskAction: 'Find the top post of the week on r/AICompanion',
  skillType: 'general',
  jobObjective: 'Join the conversation on r/AICompanion',
  safeContext: 'Voice: warm, short.',
  earlierTasks: [],
  laterTasks: [],
  history: [],
  recentChallengeCount: 0,
};

const answer = (changes: Record<string, unknown> = {}) => ({
  rationale: ' Start by opening the subreddit. ',
  isTaskDone: false,
  needsHumanJudgment: false,
  instruction: ' Open reddit.com/r/AICompanion and report the top post of the week. ',
  platform: ' Reddit.com ',
  ...changes,
});

function setup() {
  const model = { completeStructured: jest.fn() };
  const service = new TaskReasoningService(model as unknown as TaskReasoningModelClient);
  const call = () => model.completeStructured.mock.calls[0][0];
  return { model, service, call };
}

describe('TaskReasoningService', () => {
  describe('planNextStep', () => {
    it('sends the Task and its first-step marker, and returns the next step', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer());

      const step = await t.service.planNextStep(INPUT);

      expect(step).toEqual({
        instruction: 'Open reddit.com/r/AICompanion and report the top post of the week.',
        rationale: 'Start by opening the subreddit.',
        platform: 'reddit.com',
        needsHumanJudgment: false,
        isTaskDone: false,
      });
      const { userPrompt, schema, maxTokens } = t.call();
      expect(schema).toBe(PLANNED_STEP_SCHEMA);
      expect(maxTokens).toBe(PLAN_NEXT_STEP_MAX_TOKENS);
      expect(userPrompt).toContain('Action: Find the top post of the week on r/AICompanion');
      expect(userPrompt).toContain('Voice: warm, short.');
      expect(userPrompt).toContain('None — this is the first step.');
      expect(userPrompt).toContain('Gates this account hit in the last 24 hours: 0');
      expect(userPrompt).toContain('None — this is the first Task of the Job.');
      expect(userPrompt).toContain('None — this is the last planned Task of the Job.');
    });

    it("lists the Job's later Tasks and tells the planner to leave their work to them", async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer());

      await t.service.planNextStep({ ...INPUT, laterTasks: ['Reply to the top post', 'Upvote the replies'] });

      const { userPrompt } = t.call();
      expect(userPrompt).toContain(
        '<LATER_TASKS_IN_THIS_JOB>\n1. Reply to the top post\n2. Upvote the replies\nThis work is left for those Tasks.',
      );
      expect(userPrompt).toContain('Plan no step that starts it');
    });

    it('plans with the system prompt of the Task skill', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer());

      await t.service.planNextStep(INPUT);
      await t.service.planNextStep({ ...INPUT, skillType: 'creative_design' });

      expect(t.model.completeStructured.mock.calls[0][0].systemPrompt).toBe(renderTaskSkillPrompt(GENERAL_SKILL));
      expect(t.model.completeStructured.mock.calls[1][0].systemPrompt).toBe(renderTaskSkillPrompt(CREATIVE_DESIGN_SKILL));
    });

    it('shows the Job earlier Tasks with their results and locations', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer());

      await t.service.planNextStep({
        ...INPUT,
        earlierTasks: [
          {
            action: 'Create the launch post in Canva',
            status: 'complete',
            result: { summary: 'Created "Launch v1".', metricReadings: {}, completedAt: new Date() },
            failureReason: null,
            locationPath: 'canva.com/design/abc/edit',
            locationDetails: null,
          },
        ],
      });

      expect(t.call().userPrompt).toContain(
        '<EARLIER_TASKS_IN_THIS_JOB>\n1. [complete] Create the launch post in Canva\n   Result: Created "Launch v1".\n' +
          '   Location: canva.com/design/abc/edit\n</EARLIER_TASKS_IN_THIS_JOB>',
      );
    });

    it('shows every step so far with its result, metrics, location, and blocker', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer());
      const blocked: ExecutionResult = {
        ...RESULT,
        status: 'blocked',
        summary: 'A rate-limit banner appeared.',
        locationPath: '',
        metricReadings: {},
        blocker: { kind: 'rate_limited', detail: 'You are doing that too much.' },
      };

      await t.service.planNextStep({
        ...INPUT,
        recentChallengeCount: 2,
        history: [
          { instruction: 'Open the top posts', platform: 'reddit.com', result: RESULT },
          { instruction: 'Reply to the top post', platform: null, result: blocked },
        ],
      });

      const { userPrompt } = t.call();
      expect(userPrompt).toContain('1. [done] Open the top posts\n   Platform: reddit.com');
      expect(userPrompt).toContain('   Metrics: upvotes=412');
      expect(userPrompt).toContain('   Location: reddit.com/r/AICompanion/top');
      expect(userPrompt).toContain('2. [blocked] Reply to the top post\n   Result: A rate-limit banner appeared.');
      expect(userPrompt).toContain('   Blocker: rate_limited — You are doing that too much.');
      expect(userPrompt).not.toContain('How to get there');
      expect(userPrompt).toContain('Gates this account hit in the last 24 hours: 2');
    });

    it('returns a done step with no instruction when the Task is achieved', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer({ isTaskDone: true, rationale: 'Found it.', instruction: 'ignored' }));

      await expect(t.service.planNextStep(INPUT)).resolves.toEqual({
        instruction: '',
        rationale: 'Found it.',
        platform: null,
        needsHumanJudgment: false,
        isTaskDone: true,
      });
    });

    it('passes a question for the owner through as the instruction', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(
        answer({ needsHumanJudgment: true, instruction: 'Pay $20 to boost the post?', platform: null }),
      );

      await expect(t.service.planNextStep(INPUT)).resolves.toMatchObject({
        instruction: 'Pay $20 to boost the post?',
        needsHumanJudgment: true,
        platform: null,
      });
    });

    it('treats a blank platform as no platform', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer({ platform: '  ' }));

      expect((await t.service.planNextStep(INPUT)).platform).toBeNull();
    });

    it('throws on a step with no instruction that is not done', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(answer({ instruction: '  ' }));

      await expect(t.service.planNextStep(INPUT)).rejects.toThrow('empty step');
    });
  });
});
