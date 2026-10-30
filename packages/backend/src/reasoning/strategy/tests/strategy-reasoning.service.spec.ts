import type { ReasoningModelClient } from '../../reasoning-model.client';
import { MAX_JOBS_PER_UNIT, PLAN_UNIT_MAX_TOKENS, PLANNED_JOB_NAME_MAX_LENGTH } from '../strategy-reasoning.constants';
import { StrategyReasoningService } from '../strategy-reasoning.service';
import { UNIT_PLAN_OUTPUT_SCHEMA } from '../schemas/unit-plan-output.schema';
import type { PlanUnitInput } from '../types/plan-unit-input';

const INPUT: PlanUnitInput = {
  strategyName: 'Launch video',
  objective: 'A 60-second launch video for AHE',
  workType: 'one_off',
  unitName: 'Attempt 2',
  unitLimit: 3,
  canFinish: true,
  earlierUnits: [
    {
      name: 'Attempt 1',
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

function setup() {
  const model = { completeStructured: jest.fn() };
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
        rationale: 'Add a hook.',
        jobs: [job('Add a hook'), job('Export', 'Export at 1080p', 'ordered'), job('Thumbnail', 'Make a thumbnail', 'unordered')],
      });

      const plan = await t.service.planUnitOfWork(INPUT);

      expect(plan).toEqual({
        decision: 'plan',
        rationale: 'Add a hook.',
        jobs: [job('Add a hook'), job('Export', 'Export at 1080p'), job('Thumbnail', 'Make a thumbnail', 'unordered')],
      });
      const { userPrompt, schema, maxTokens } = t.call();
      expect(schema).toBe(UNIT_PLAN_OUTPUT_SCHEMA);
      expect(maxTokens).toBe(PLAN_UNIT_MAX_TOKENS);
      expect(userPrompt).toContain('Objective: A 60-second launch video for AHE');
      expect(userPrompt).toContain('at most 3 attempts');
      expect(userPrompt).toContain('Planning: Attempt 2');
      expect(userPrompt).toContain('1. [success] (ordered) Cut the footage');
      expect(userPrompt).toContain('   Mark: 4/10');
      expect(userPrompt).toContain('   Bad: No hook in the first 3 seconds.');
    });

    it('accepts "done" when the Unit may finish the Strategy', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'done', rationale: 'Marked 9/10.', jobs: [] });

      await expect(t.service.planUnitOfWork(INPUT)).resolves.toEqual({ decision: 'done', rationale: 'Marked 9/10.' });
    });

    it('rejects "done" for a Unit that must be planned', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'done', rationale: 'Looks fine.', jobs: [] });

      await expect(t.service.planUnitOfWork({ ...INPUT, canFinish: false, earlierUnits: [] })).rejects.toThrow('"done"');
      expect(t.call().userPrompt).toContain('"done" is not allowed');
      expect(t.call().userPrompt).toContain('None — this is the first Unit of the Strategy.');
    });

    it('drops Jobs with no objective, and throws when none are left', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ decision: 'plan', rationale: '', jobs: [job('Empty', '  ')] });

      await expect(t.service.planUnitOfWork(INPUT)).rejects.toThrow('no Jobs');
    });

    it(`keeps at most ${MAX_JOBS_PER_UNIT} Jobs and names a nameless Job by its objective`, async () => {
      const t = setup();
      const long = 'x'.repeat(PLANNED_JOB_NAME_MAX_LENGTH + 50);
      t.model.completeStructured.mockResolvedValue({
        decision: 'plan',
        rationale: '',
        jobs: [job(' ', long), ...Array.from({ length: MAX_JOBS_PER_UNIT + 2 }, (_, i) => job(`Job ${i}`))],
      });

      const plan = await t.service.planUnitOfWork(INPUT);

      if (plan.decision !== 'plan') throw new Error('expected a plan');
      expect(plan.jobs).toHaveLength(MAX_JOBS_PER_UNIT);
      expect(plan.jobs[0]).toEqual({ name: long.slice(0, PLANNED_JOB_NAME_MAX_LENGTH), objective: long, orderType: 'ordered' });
    });
  });
});
