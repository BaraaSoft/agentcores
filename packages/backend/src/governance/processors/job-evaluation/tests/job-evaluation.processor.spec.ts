import type { Job, Queue } from 'bullmq';
import type { JobEvaluationJobData } from '../../../../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../../../../queue/types/job-execution-job-data';
import type { EvaluationReasoningService } from '../../../../reasoning/evaluation/evaluation-reasoning.service';
import type { JobJudgement } from '../../../../reasoning/evaluation/types/job-judgement';
import type { JobEvaluationService } from '../../../services/job-evaluation.service';
import type { JobService } from '../../../services/job.service';
import type { TaskService } from '../../../services/task.service';
import { EVALUATIONS_UNIT_NAME, MAX_JUDGING_ATTEMPTS } from '../job-evaluation.constants';
import { JobEvaluationProcessor } from '../job-evaluation.processor';

const WORKFLOW_ID = 'wf-1';
const EVALUATION_ID = 'eval-1';
const JOB_ID = 'job-1';
const STRATEGY_ID = 'strategy-1';
const DATE = '2026-10-26';

const SCORED: JobJudgement = {
  verdict: 'scored',
  score: 4,
  objectiveSummary: 'Introduce a product to a small online community through a text post.',
  whatGood: 'Led with a question.',
  whatBad: 'Posted at 3am, so it was buried by morning.',
  rubric: 'Judged on upvotes.',
};

const NEEDS_EVIDENCE: JobJudgement = {
  verdict: 'needs_evidence',
  evidenceJobName: 'Read upvotes on the intro post',
  evidenceObjective: 'Open the post and report its upvotes.',
  evidenceCriteria: [],
  rubric: 'Upvotes decide the score.',
};

function evaluation(changes: Record<string, unknown> = {}) {
  return {
    id: EVALUATION_ID,
    owner: 'owner-1',
    jobId: JOB_ID,
    state: 'judging',
    evidenceJobId: null,
    job: {
      id: JOB_ID,
      name: 'Introduce AHE on r/AICompanion',
      objective: 'Post an introduction and earn 50 upvotes',
      outcomeStatus: 'success',
      outcomeSummary: 'Intro posted.',
      unitOfWork: { name: 'Community engagement', strategyId: STRATEGY_ID, successCriteria: [] },
    },
    ...changes,
  };
}

function setup() {
  const evaluationQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const jobQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const evaluationReasoning = { judgeJob: jest.fn().mockResolvedValue(SCORED) };
  const evaluations = {
    createEvaluation: jest.fn().mockResolvedValue(evaluation()),
    findEvaluationById: jest.fn().mockResolvedValue(evaluation()),
    recordJudgingAttempt: jest.fn().mockResolvedValue(1),
    recordScore: jest.fn().mockResolvedValue(true),
    parkForEvidence: jest.fn().mockResolvedValue(true),
    failEvaluation: jest.fn().mockResolvedValue(true),
  };
  const jobs = {
    listJobsWithActivityOn: jest
      .fn()
      .mockResolvedValue([{ id: JOB_ID, unitOfWorkId: 'unit-1', unitOfWork: { strategy: { owner: 'owner-1' } } }]),
    placeJob: jest.fn().mockResolvedValue({ id: 'evidence-job-1' }),
    findJobById: jest.fn().mockResolvedValue(null),
  };
  const tasks = { listTasks: jest.fn().mockResolvedValue([]) };

  const processor = new JobEvaluationProcessor(
    evaluationQueue as unknown as Queue<JobEvaluationJobData>,
    jobQueue as unknown as Queue<JobExecutionJobData>,
    evaluationReasoning as unknown as EvaluationReasoningService,
    evaluations as unknown as JobEvaluationService,
    jobs as unknown as JobService,
    tasks as unknown as TaskService,
  );
  const run = (data: JobEvaluationJobData) => processor.process({ data } as Job<JobEvaluationJobData>);
  const sweep = () => run({ kind: 'sweep', workflowId: WORKFLOW_ID, evaluationDate: DATE });
  const judge = () => run({ kind: 'judge', workflowId: WORKFLOW_ID, evaluationId: EVALUATION_ID });

  return { sweep, judge, evaluationQueue, jobQueue, evaluationReasoning, evaluations, jobs, tasks };
}

describe('JobEvaluationProcessor', () => {
  describe('the daily sweep', () => {
    it('opens a judgement for each Job that saw activity and queues it', async () => {
      const t = setup();

      await t.sweep();

      expect(t.jobs.listJobsWithActivityOn).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, evaluationDate: DATE });
      expect(t.evaluations.createEvaluation).toHaveBeenCalledWith({
        owner: 'owner-1',
        jobId: JOB_ID,
        unitOfWorkId: 'unit-1',
        evaluationDate: DATE,
      });
      expect(t.evaluationQueue.add).toHaveBeenCalledWith(EVALUATION_ID, {
        kind: 'judge',
        workflowId: WORKFLOW_ID,
        evaluationId: EVALUATION_ID,
      });
    });

    it('leaves judgements that already settled alone', async () => {
      const t = setup();
      t.evaluations.createEvaluation.mockResolvedValue(evaluation({ state: 'scored' }));

      await t.sweep();

      expect(t.evaluationQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('judging', () => {
    it('marks the Job and stores the score with its feedback', async () => {
      const t = setup();

      await t.judge();

      expect(t.evaluationReasoning.judgeJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'Introduce AHE on r/AICompanion',
          objective: 'Post an introduction and earn 50 upvotes',
          unitName: 'Community engagement',
          outcomeStatus: 'success',
          evidence: null,
        }),
      );
      expect(t.evaluations.recordScore).toHaveBeenCalledWith({
        evaluationId: EVALUATION_ID,
        score: 4,
        objectiveSummary: 'Introduce a product to a small online community through a text post.',
        whatGood: 'Led with a question.',
        whatBad: 'Posted at 3am, so it was buried by morning.',
        rubric: 'Judged on upvotes.',
      });
    });

    it('files an evidence Job under the Evaluations Unit, parks the judgement, and starts it', async () => {
      const t = setup();
      t.evaluationReasoning.judgeJob.mockResolvedValue(NEEDS_EVIDENCE);

      await t.judge();

      expect(t.jobs.placeJob).toHaveBeenCalledWith({
        strategyId: STRATEGY_ID,
        plannedJob: {
          name: 'Read upvotes on the intro post',
          objective: 'Open the post and report its upvotes.',
          unitName: EVALUATIONS_UNIT_NAME,
        },
      });
      expect(t.evaluations.parkForEvidence).toHaveBeenCalledWith(EVALUATION_ID, 'evidence-job-1');
      expect(t.jobQueue.add).toHaveBeenCalledWith(
        'evidence-job-1',
        { workflowId: WORKFLOW_ID, jobId: 'evidence-job-1' },
        { jobId: 'evidence-job-1' },
      );
      expect(t.evaluations.recordScore).not.toHaveBeenCalled();
    });

    it('carries the criteria into the errand with the key each reading must come back under', async () => {
      const t = setup();
      t.evaluationReasoning.judgeJob.mockResolvedValue({
        ...NEEDS_EVIDENCE,
        evidenceObjective: 'Open /Users/owner/Movies/launch-cut.mp4 in QuickTime.',
        evidenceCriteria: [
          { key: 'title_legibility', whatToExamine: 'Whether the titles stay readable at normal size.' },
          { key: 'opening_hook', whatToExamine: 'Whether the first three seconds give a reason to keep watching.' },
        ],
      });

      await t.judge();

      expect(t.jobs.placeJob.mock.calls[0][0].plannedJob.objective).toBe(
        'Open /Users/owner/Movies/launch-cut.mp4 in QuickTime.\n\n' +
          'Open the work once and rate each of these from 1 to 10, reporting each as a metric reading under the key in brackets:\n' +
          '1. (title_legibility) Whether the titles stay readable at normal size.\n' +
          '2. (opening_hook) Whether the first three seconds give a reason to keep watching.',
      );
    });

    it('shows the evidence a resumed judgement was waiting for', async () => {
      const t = setup();
      t.evaluations.findEvaluationById.mockResolvedValue(evaluation({ evidenceJobId: 'evidence-job-1' }));
      t.jobs.findJobById.mockResolvedValue({
        id: 'evidence-job-1',
        objective: 'Report the upvotes on the intro post',
        outcomeStatus: 'success',
        outcomeSummary: '61 upvotes.',
      });

      await t.judge();

      expect(t.evaluationReasoning.judgeJob).toHaveBeenCalledWith(
        expect.objectContaining({
          evidence: {
            objective: 'Report the upvotes on the intro post',
            outcomeStatus: 'success',
            outcomeSummary: '61 upvotes.',
            tasks: [],
          },
        }),
      );
    });

    it('gives up when the evidence it already gathered still does not settle the mark', async () => {
      const t = setup();
      t.evaluations.findEvaluationById.mockResolvedValue(evaluation({ evidenceJobId: 'evidence-job-1' }));
      t.evaluationReasoning.judgeJob.mockResolvedValue(NEEDS_EVIDENCE);

      await t.judge();

      expect(t.jobs.placeJob).not.toHaveBeenCalled();
      expect(t.evaluations.failEvaluation).toHaveBeenCalledWith(EVALUATION_ID, expect.stringContaining('did not settle'));
    });

    it('gives up once judging has thrown too many times', async () => {
      const t = setup();
      t.evaluations.recordJudgingAttempt.mockResolvedValue(MAX_JUDGING_ATTEMPTS + 1);

      await t.judge();

      expect(t.evaluationReasoning.judgeJob).not.toHaveBeenCalled();
      expect(t.evaluations.failEvaluation).toHaveBeenCalledWith(EVALUATION_ID, expect.stringContaining('threw'));
    });

    it('does nothing when the judgement has already settled', async () => {
      const t = setup();
      t.evaluations.findEvaluationById.mockResolvedValue(evaluation({ state: 'scored' }));

      await t.judge();

      expect(t.evaluations.recordJudgingAttempt).not.toHaveBeenCalled();
      expect(t.evaluationReasoning.judgeJob).not.toHaveBeenCalled();
    });
  });

  it("judges a Job whose Unit of Work is paused, so the judgement never strands in 'judging'", async () => {
    const t = setup();
    const settled = evaluation();
    t.evaluations.findEvaluationById.mockResolvedValue({
      ...settled,
      job: { ...settled.job, unitOfWork: { ...settled.job.unitOfWork, state: 'paused' } },
    });
    t.evaluationReasoning.judgeJob.mockResolvedValue(SCORED);

    await t.judge();

    expect(t.evaluations.recordScore).toHaveBeenCalled();
  });
});
