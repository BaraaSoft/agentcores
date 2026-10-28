import type { ReasoningModelClient } from '../../reasoning-model.client';
import type { TaskOutcome } from '../../job/types/task-outcome';
import { JUDGE_JOB_MAX_TOKENS, MAX_JOB_SCORE, MIN_JOB_SCORE } from '../evaluation-reasoning.constants';
import { EvaluationReasoningService } from '../evaluation-reasoning.service';
import { JOB_JUDGEMENT_OUTPUT_SCHEMA } from '../schemas/job-judgement-output.schema';
import type { JudgeJobInput } from '../types/judge-job-input';

const POSTED: TaskOutcome = {
  action: 'Post a text-only intro in r/AICompanion',
  status: 'complete',
  result: { summary: 'Posted; 3 upvotes so far.', metricReadings: { upvotes: 3 }, completedAt: new Date() },
  failureReason: null,
  locationPath: 'reddit.com/r/AICompanion/comments/abc123',
  locationDetails: null,
};

const JOB: JudgeJobInput = {
  jobName: 'Introduce AHE on r/AICompanion',
  objective: 'Post an introduction and earn at least 50 upvotes',
  unitName: 'Community engagement',
  successCriteria: [{ key: 'reddit_upvotes', label: 'Upvotes', target: 50 }],
  outcomeStatus: 'success',
  outcomeSummary: 'Intro posted.',
  tasks: [POSTED],
  evidence: null,
};

const SCORED = {
  verdict: 'scored' as const,
  rubric: 'Judged on upvotes against the 50 the Unit asks for.',
  score: 4,
  objectiveSummary: 'Introduce a product to a small, topic-focused online community through a text post.',
  whatGood: 'Led with a question, which pulled replies.',
  whatBad: 'Posted at 3am local time, so the thread was buried by morning.',
  evidenceJobName: null,
  evidenceObjective: null,
};

const NEEDS_EVIDENCE = {
  verdict: 'needs_evidence' as const,
  rubric: 'Upvotes decide the score and the post was only minutes old.',
  score: null,
  objectiveSummary: null,
  whatGood: null,
  whatBad: null,
  evidenceJobName: 'Read upvotes on the intro post',
  evidenceObjective: 'Open reddit.com/r/AICompanion/comments/abc123 and report its upvotes, comments, and views.',
};

function setup() {
  const model = { completeStructured: jest.fn() };
  const service = new EvaluationReasoningService(model as unknown as ReasoningModelClient);
  const call = () => model.completeStructured.mock.calls[0][0];
  return { model, service, call };
}

describe('EvaluationReasoningService', () => {
  describe('judgeJob', () => {
    it('sends the objective, the standard, and the Task outcomes, and returns the mark', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);

      const judgement = await t.service.judgeJob(JOB);

      expect(judgement).toEqual({
        verdict: 'scored',
        score: 4,
        objectiveSummary: 'Introduce a product to a small, topic-focused online community through a text post.',
        whatGood: 'Led with a question, which pulled replies.',
        whatBad: 'Posted at 3am local time, so the thread was buried by morning.',
        rubric: 'Judged on upvotes against the 50 the Unit asks for.',
      });
      const { systemPrompt, userPrompt, schema, maxTokens } = t.call();
      expect(schema).toBe(JOB_JUDGEMENT_OUTPUT_SCHEMA);
      expect(maxTokens).toBe(JUDGE_JOB_MAX_TOKENS);
      expect(systemPrompt).toContain('Do not drift to the middle');
      expect(userPrompt).toContain('Objective: Post an introduction and earn at least 50 upvotes');
      expect(userPrompt).toContain('Status: success');
      expect(userPrompt).toContain('* Upvotes (reddit_upvotes): target 50');
      expect(userPrompt).toContain('1. [complete] Post a text-only intro in r/AICompanion\n   Result: Posted; 3 upvotes so far.');
      expect(userPrompt).toContain('<EVIDENCE_GATHERED>\nNone requested yet.\n</EVIDENCE_GATHERED>');
    });

    it('says the Job is still open when it has no outcome yet', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);

      await t.service.judgeJob({ ...JOB, outcomeStatus: null, outcomeSummary: null });

      expect(t.call().userPrompt).toContain('Status: still open');
    });

    it('returns the errand when the real outcome has to be read first', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(NEEDS_EVIDENCE);

      const judgement = await t.service.judgeJob(JOB);

      expect(judgement).toEqual({
        verdict: 'needs_evidence',
        evidenceJobName: 'Read upvotes on the intro post',
        evidenceObjective: 'Open reddit.com/r/AICompanion/comments/abc123 and report its upvotes, comments, and views.',
        rubric: 'Upvotes decide the score and the post was only minutes old.',
      });
    });

    it('names the errand after the Job when the model leaves the name out', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...NEEDS_EVIDENCE, evidenceJobName: '' });

      const judgement = await t.service.judgeJob(JOB);

      expect(judgement).toMatchObject({ evidenceJobName: 'Measure: Introduce AHE on r/AICompanion' });
    });

    it('shows gathered evidence and tells the model not to ask again', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);

      await t.service.judgeJob({
        ...JOB,
        evidence: {
          objective: 'Report the upvotes on the intro post',
          outcomeStatus: 'success',
          outcomeSummary: '61 upvotes, 14 comments.',
          tasks: [POSTED],
        },
      });

      const { userPrompt } = t.call();
      expect(userPrompt).toContain('Mark the Job on it; do not ask again.');
      expect(userPrompt).toContain('Came back with: 61 upvotes, 14 comments.');
    });

    it.each([
      [42, MAX_JOB_SCORE],
      [0, MIN_JOB_SCORE],
    ])('keeps a score of %i inside the scale', async (given, expected) => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...SCORED, score: given });

      expect(await t.service.judgeJob(JOB)).toMatchObject({ score: expected });
    });

    it('falls back to the raw objective rather than losing the mark', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...SCORED, objectiveSummary: null });

      expect(await t.service.judgeJob(JOB)).toMatchObject({ objectiveSummary: JOB.objective });
    });

    it('throws when the model asks for evidence without saying what to find out', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...NEEDS_EVIDENCE, evidenceObjective: null });

      await expect(t.service.judgeJob(JOB)).rejects.toThrow('without saying what to find out');
    });

    it('throws when the model marks the Job without a score', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...SCORED, score: null });

      await expect(t.service.judgeJob(JOB)).rejects.toThrow('without a score');
    });
  });
});
