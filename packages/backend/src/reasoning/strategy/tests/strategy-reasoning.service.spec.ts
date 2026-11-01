import type { ReasoningModelClient } from '../../reasoning-model.client';
import {
  MAX_JOBS_PER_UNIT_OF_WORK,
  PLAN_UNIT_OF_WORK_MAX_FETCHES,
  PLAN_UNIT_OF_WORK_MAX_SEARCHES,
  PLAN_UNIT_OF_WORK_MAX_TOKENS,
  PLANNED_JOB_NAME_MAX_LENGTH,
  UNIT_OF_WORK_TITLE_MAX_LENGTH,
} from '../strategy-reasoning.constants';
import { StrategyReasoningService } from '../strategy-reasoning.service';
import { UNIT_OF_WORK_PLAN_OUTPUT_SCHEMA } from '../schemas/unit-of-work-plan-output.schema';
import type { PlanUnitOfWorkInput } from '../types/plan-unit-of-work-input';

const INPUT: PlanUnitOfWorkInput = {
  strategyName: 'Launch video',
  objective: 'A 60-second launch video for AHE',
  workType: 'one_off',
  unitOfWorkName: 'Attempt 2',
  unitOfWorkLimit: 3,
  canFinish: true,
  earlierUnitsOfWork: [
    {
      name: 'Attempt 1',
      title: 'Long intro, hook at 8 seconds',
      rationale: 'Tell the full story first.',
      status: 'complete',
      jobs: [
        {
          name: 'Cut the footage',
          objective: 'Cut the demo footage to 60 seconds in Final Cut',
          orderType: 'ordered',
          outcomeStatus: 'success',
          outcomeSummary: 'Cut to 58 seconds.',
          evaluation: { score: 4, whatGood: 'Tight pacing.', whatBad: 'No hook in the first 3 seconds.' },
        },
      ],
    },
  ],
  relatedEvaluations: [],
};

const job = (name: string, objective = `Do ${name}`, orderType: 'ordered' | 'unordered' = 'ordered') => ({
  name,
  objective,
  orderType,
});

function setup(canFetch = true) {
  const model = { completeStructured: jest.fn(), canFetch };
  const service = new StrategyReasoningService(model as unknown as ReasoningModelClient);
  const call = () => model.completeStructured.mock.calls[0][0];
  return { model, service, call };
}

describe('StrategyReasoningService', () => {
  describe('planUnitOfWork', () => {
    it('sends the Strategy and the marks of its earlier Units, and returns the Jobs in order', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({
        decision: 'plan',
        title: ' Hook in the first 3 seconds ',
        rationale: 'Add a hook.',
        jobs: [job('Add a hook'), job('Export', 'Export at 1080p', 'ordered'), job('Thumbnail', 'Make a thumbnail', 'unordered')],
      });

      const plan = await t.service.planUnitOfWork(INPUT);

      expect(plan).toEqual({
        decision: 'plan',
        title: 'Hook in the first 3 seconds',
        rationale: 'Add a hook.',
        jobs: [job('Add a hook'), job('Export', 'Export at 1080p'), job('Thumbnail', 'Make a thumbnail', 'unordered')],
      });
      const { userPrompt, schema, maxTokens } = t.call();
      expect(schema).toBe(UNIT_OF_WORK_PLAN_OUTPUT_SCHEMA);
      expect(maxTokens).toBe(PLAN_UNIT_OF_WORK_MAX_TOKENS);
      expect(userPrompt).toContain('Objective: A 60-second launch video for AHE');
      expect(userPrompt).toContain('at most 3 attempts');
      expect(userPrompt).toContain('Planning: Attempt 2');
      expect(userPrompt).toContain('Attempt 1: Long intro, hook at 8 seconds (complete)\nWhy: Tell the full story first.');
      expect(userPrompt).toContain('1. [success] (ordered) Cut the footage');
      expect(userPrompt).toContain('   Mark: 4/10');
      expect(userPrompt).toContain('   Bad: No hook in the first 3 seconds.');
    });

    it('lets the planner search the web and read pages, and tells it to research before it plans', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'plan', title: 'T', rationale: '', jobs: [job('Do it')] });

      await t.service.planUnitOfWork(INPUT);

      const { webSearch, webFetch, systemPrompt } = t.call();
      expect(webSearch).toEqual({ maxSearches: PLAN_UNIT_OF_WORK_MAX_SEARCHES });
      expect(webFetch).toEqual({ maxFetches: PLAN_UNIT_OF_WORK_MAX_FETCHES });
      expect(systemPrompt).toContain('<RESEARCH>');
      expect(systemPrompt).toContain('You have two web tools, and you choose which fits');
      expect(systemPrompt).toContain('Read every address the Strategy or the owner context gives. Search for every name');
      expect(systemPrompt).toContain('Turn inspiration into direction, never into a copy.');
    });

    it('tells a model that cannot fetch pages to search for addresses, and never mentions web_fetch', async () => {
      const t = setup(false);
      t.model.completeStructured.mockResolvedValue({ decision: 'plan', title: 'T', rationale: '', jobs: [job('Do it')] });

      await t.service.planUnitOfWork(INPUT);

      const { systemPrompt } = t.call();
      expect(systemPrompt).toContain('Your web tool is web_search');
      expect(systemPrompt).toContain('Search for every address the Strategy or the owner context gives.');
      expect(systemPrompt).not.toContain('web_fetch');
      expect(systemPrompt).toContain('Turn inspiration into direction, never into a copy.');
    });

    it('accepts "done" when the Unit may finish the Strategy', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'done', title: '', rationale: 'Marked 9/10.', jobs: [] });

      await expect(t.service.planUnitOfWork(INPUT)).resolves.toEqual({ decision: 'done', rationale: 'Marked 9/10.' });
    });

    it('rejects "done" for a Unit that must be planned', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'done', title: '', rationale: 'Looks fine.', jobs: [] });

      await expect(t.service.planUnitOfWork({ ...INPUT, canFinish: false, earlierUnitsOfWork: [] })).rejects.toThrow('"done"');
      expect(t.call().userPrompt).toContain('"done" is not allowed');
      expect(t.call().userPrompt).toContain('None — this is the first Unit of the Strategy.');
    });

    it('drops Jobs with no objective, and throws when none are left', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'plan', title: 'Empty', rationale: '', jobs: [job('Empty', '  ')] });

      await expect(t.service.planUnitOfWork(INPUT)).rejects.toThrow('no Jobs');
    });

    it(`keeps at most ${MAX_JOBS_PER_UNIT_OF_WORK} Jobs and names a nameless Job by its objective`, async () => {
      const t = setup();
      const long = 'x'.repeat(PLANNED_JOB_NAME_MAX_LENGTH + 50);
      t.model.completeStructured.mockResolvedValue({
        decision: 'plan',
        title: '',
        rationale: '',
        jobs: [job(' ', long), ...Array.from({ length: MAX_JOBS_PER_UNIT_OF_WORK + 2 }, (_, i) => job(`Job ${i}`))],
      });

      const plan = await t.service.planUnitOfWork(INPUT);

      if (plan.decision !== 'plan') throw new Error('expected a plan');
      expect(plan.jobs).toHaveLength(MAX_JOBS_PER_UNIT_OF_WORK);
      expect(plan.jobs[0]).toEqual({ name: long.slice(0, PLANNED_JOB_NAME_MAX_LENGTH), objective: long, orderType: 'ordered' });
      expect(plan.title).toBe(long.slice(0, UNIT_OF_WORK_TITLE_MAX_LENGTH));
    });

    it('shows only the name of an earlier Unit of Work that has no title', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'done', title: '', rationale: 'Met.', jobs: [] });
      const [earlier] = INPUT.earlierUnitsOfWork;

      await t.service.planUnitOfWork({ ...INPUT, earlierUnitsOfWork: [{ ...earlier, title: '', rationale: '' }] });

      expect(t.call().userPrompt).toContain('Attempt 1 (complete)\n1. [success]');
    });
  });
});
