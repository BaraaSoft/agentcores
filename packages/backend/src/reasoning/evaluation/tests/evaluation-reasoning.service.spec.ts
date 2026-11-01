import type { ReasoningModelClient } from '../../reasoning-model.client';
import type { TaskOutcome } from '../../job/types/task-outcome';
import { JUDGE_JOB_MAX_SEARCHES, JUDGE_JOB_MAX_TOKENS, MAX_JOB_SCORE, MIN_JOB_SCORE } from '../evaluation-reasoning.constants';
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
  strategyObjective: 'Get the first 100 people to try AHE',
  outcomeStatus: 'success',
  outcomeSummary: 'Intro posted.',
  tasks: [POSTED],
  evidence: null,
  screenshot: null,
};

const SCORED = {
  verdict: 'scored' as const,
  rubric: 'Judged on upvotes against the 50 the Unit asks for.',
  score: 4,
  objectiveSummary: 'Introduce a product to a small, topic-focused online community through a text post.',
  whatGood: 'Led with a question, which pulled replies.',
  whatBad: 'Posted at 3am local time, so the thread was buried by morning.',
};

const NEEDS_EVIDENCE = {
  verdict: 'needs_evidence' as const,
  rubric: 'Upvotes decide the score and the post was only minutes old.',
  evidenceJobName: 'Read upvotes on the intro post',
  evidenceObjective: 'Open reddit.com/r/AICompanion/comments/abc123 and report its upvotes, comments, and views.',
  evidenceCriteria: [],
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
      expect(systemPrompt).toContain('name no style, the bar is modern, creative, and elegant work');
      expect(userPrompt).toContain('Objective: Post an introduction and earn at least 50 upvotes');
      expect(userPrompt).toContain('Status: success');
      expect(userPrompt).toContain('<STRATEGY_OBJECTIVE>\nGet the first 100 people to try AHE\n</STRATEGY_OBJECTIVE>');
      expect(userPrompt).toContain('1. [complete] Post a text-only intro in r/AICompanion\n   Result: Posted; 3 upvotes so far.');
      expect(userPrompt).toContain('<EVIDENCE_GATHERED>\nNone requested yet.\n</EVIDENCE_GATHERED>');
      expect(userPrompt).toContain('<SCREENSHOT>\nNone — this Job did no visual work.\n</SCREENSHOT>');
      expect(t.call().images).toBeUndefined();
    });

    it('attaches the screenshot of visual work so the evaluator can see it', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);
      const screenshot = { mediaType: 'image/png' as const, base64: 'iVBORw0KGgo=' };

      await t.service.judgeJob({ ...JOB, screenshot });

      expect(t.call().images).toEqual([screenshot]);
      expect(t.call().userPrompt).toContain('Attached: the screen as the Job’s latest visual Task ended.');
      expect(t.call().systemPrompt).toContain('mark its quality from the screenshot yourself');
    });

    it('may search the web to work out what good looks like', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);

      await t.service.judgeJob(JOB);

      expect(t.call().webSearch).toEqual({ maxSearches: JUDGE_JOB_MAX_SEARCHES });
      expect(t.call().systemPrompt).toContain('search\n  the web and find out');
    });

    it('shows where work done in software landed, so the errand can say what to open', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue(SCORED);

      await t.service.judgeJob({
        ...JOB,
        tasks: [
          {
            ...POSTED,
            action: 'Export the launch cut',
            result: { summary: 'Rendered a 45-second cut.', metricReadings: {}, completedAt: new Date() },
            locationPath: '/Users/owner/Movies/launch-cut.mp4',
            locationDetails: 'Final Cut Pro → Library → Launch → launch-cut',
          },
        ],
      });

      expect(t.call().userPrompt).toContain('   Location: /Users/owner/Movies/launch-cut.mp4');
      expect(t.call().userPrompt).toContain('   How to get there: Final Cut Pro → Library → Launch → launch-cut');
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
        evidenceCriteria: [],
        evidenceJobName: 'Read upvotes on the intro post',
        evidenceObjective: 'Open reddit.com/r/AICompanion/comments/abc123 and report its upvotes, comments, and views.',
        rubric: 'Upvotes decide the score and the post was only minutes old.',
      });
    });

    it('passes the criteria through when the mark turns on quality that has to be seen', async () => {
      const t = setup();
      const criteria = [{ key: 'title_legibility', whatToExamine: 'Whether the titles stay readable at normal size.' }];
      t.model.completeStructured.mockResolvedValue({ ...NEEDS_EVIDENCE, evidenceCriteria: criteria });

      expect(await t.service.judgeJob(JOB)).toMatchObject({ evidenceCriteria: criteria });
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

    it('falls back to the raw objective rather than losing the mark', async () => {
      const t = setup();
      t.model.completeStructured.mockResolvedValue({ ...SCORED, objectiveSummary: '' });

      expect(await t.service.judgeJob(JOB)).toMatchObject({ objectiveSummary: JOB.objective });
    });
  });

  describe('the answer schema', () => {
    it.each([
      ['an evidence request without an objective', { ...NEEDS_EVIDENCE, evidenceObjective: '' }],
      ['an evidence request with no objective field', { ...NEEDS_EVIDENCE, evidenceObjective: undefined }],
      ['a mark without a score', { ...SCORED, score: undefined }],
      ['a mark that carries a null score', { ...SCORED, score: null }],
      ['a mark below the scale', { ...SCORED, score: MIN_JOB_SCORE - 1 }],
      ['a mark above the scale', { ...SCORED, score: MAX_JOB_SCORE + 1 }],
    ])('rejects %s', (_case, answer) => {
      expect(JOB_JUDGEMENT_OUTPUT_SCHEMA.safeParse(answer).success).toBe(false);
    });

    it('accepts a full mark and a full evidence request', () => {
      expect(JOB_JUDGEMENT_OUTPUT_SCHEMA.safeParse(SCORED).success).toBe(true);
      expect(JOB_JUDGEMENT_OUTPUT_SCHEMA.safeParse(NEEDS_EVIDENCE).success).toBe(true);
    });
  });
});
