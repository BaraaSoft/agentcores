import { NotFoundException } from '@nestjs/common';
import type { JobEvaluationService } from '../../../../governance/services/job-evaluation.service';
import type { JobService } from '../../../../governance/services/job.service';
import type { TaskService } from '../../../../governance/services/task.service';
import type { UnitOfWorkService } from '../../../../governance/services/unit-of-work.service';
import type { WorkflowService } from '../../../../workflow/workflow.service';
import { ProgressApiService } from '../progress-api.service';

const CREATED = new Date('2026-10-30T10:00:00Z');

const STRATEGY = {
  id: 'strategy-1',
  owner: 'owner-1',
  name: 'Launch',
  objective: 'Launch AHE',
  workType: 'one_off',
  versionCount: null,
  maxAttempts: 3,
  status: 'active',
  startDate: CREATED,
  endDate: null,
  goldStandards: null,
};

const UNITS_OF_WORK = [
  {
    id: 'unit-1',
    sequence: 1,
    name: 'Attempt 1',
    title: 'Long intro, hook at 8 seconds',
    rationale: 'Start with the full story.',
    status: 'complete',
    evaluateAfter: CREATED,
    createdAt: CREATED,
    state: 'running',
  },
  {
    id: 'unit-2',
    sequence: 2,
    name: 'Attempt 2',
    title: 'Hook in the first 3 seconds',
    rationale: 'Attempt 1 lost viewers before the hook.',
    status: 'open',
    evaluateAfter: null,
    createdAt: CREATED,
    state: 'running',
  },
];

function job(id: string, unitOfWorkId: string, outcomeStatus: string | null) {
  return {
    id,
    unitOfWorkId,
    name: `Job ${id}`,
    objective: `Do ${id}`,
    orderType: 'unordered',
    orderNumber: null,
    outcomeStatus,
    outcomeSummary: outcomeStatus === null ? null : 'Done.',
    closedAt: outcomeStatus === null ? null : CREATED,
    reviewingAttempts: 0,
  };
}

function setup(workflow: unknown = { id: 'wf-1', strategyId: STRATEGY.id, state: 'running', strategy: STRATEGY }) {
  const workflows = { findWorkflowById: jest.fn().mockResolvedValue(workflow) };
  const unitsOfWork = { listUnitsOfWork: jest.fn().mockResolvedValue(UNITS_OF_WORK) };
  const jobs = {
    listJobsInUnits: jest.fn().mockResolvedValue([job('a', 'unit-1', 'success'), job('b', 'unit-1', 'failed'), job('c', 'unit-2', null)]),
  };
  const tasks = {
    listTasksInJobs: jest.fn().mockResolvedValue([
      task('t1', 'c', 1, 'complete', { summary: 'Drafted the post.', metricReadings: {}, completedAt: CREATED }),
      task('t2', 'c', 2, 'running', null),
    ]),
  };
  const evaluations = {
    listEvaluationsByJob: jest.fn().mockResolvedValue(
      new Map([
        ['a', { jobId: 'a', state: 'scored', score: 8, whatGood: 'Clear.', whatBad: 'Late.', rubric: 'Upvotes.', attempts: 1 }],
        ['b', { jobId: 'b', state: 'evaluating', score: null, whatGood: '', whatBad: '', rubric: '', attempts: 0 }],
      ]),
    ),
  };
  const service = new ProgressApiService(
    workflows as unknown as WorkflowService,
    unitsOfWork as unknown as UnitOfWorkService,
    jobs as unknown as JobService,
    tasks as unknown as TaskService,
    evaluations as unknown as JobEvaluationService,
  );
  return { service, workflows, unitsOfWork, jobs, tasks, evaluations };
}

function task(id: string, jobId: string, sequence: number, status: string, result: unknown) {
  return {
    id,
    jobId,
    workflowId: 'wf-1',
    sequence,
    action: `Step ${sequence}`,
    skillType: 'general',
    status,
    result,
    failureReason: null,
    locationPath: null,
    locationDetails: null,
    startedAt: CREATED,
    completedAt: null,
    reviewedAt: null,
    createdAt: CREATED,
  };
}

describe('ProgressApiService', () => {
  it('groups each Job under its Unit of Work, with its evaluation when one exists', async () => {
    const t = setup();

    const progress = await t.service.getWorkflowProgress('wf-1');

    expect(progress).toMatchObject({ workflowId: 'wf-1', workflowState: 'running', strategy: { id: 'strategy-1', workType: 'one_off' } });
    expect(progress.unitsOfWork.map((unitOfWork) => [unitOfWork.name, unitOfWork.jobs.map((j) => j.id)])).toEqual([
      ['Attempt 1', ['a', 'b']],
      ['Attempt 2', ['c']],
    ]);
    const [first, second] = progress.unitsOfWork[0].jobs;
    expect(first.evaluation).toEqual({ state: 'scored', score: 8, whatGood: 'Clear.', whatBad: 'Late.', rubric: 'Upvotes.' });
    expect(second.evaluation).toMatchObject({ state: 'evaluating', score: null });
    expect(progress.unitsOfWork[1].jobs[0]).toMatchObject({ outcomeStatus: null, evaluation: null });
    expect(progress.unitsOfWork[1]).toMatchObject({
      title: 'Hook in the first 3 seconds',
      rationale: 'Attempt 1 lost viewers before the hook.',
    });
  });

  it('reads the Jobs, Tasks, and evaluations of all the Units of Work in one call each', async () => {
    const t = setup();

    await t.service.getWorkflowProgress('wf-1');

    expect(t.unitsOfWork.listUnitsOfWork).toHaveBeenCalledWith('strategy-1');
    expect(t.jobs.listJobsInUnits).toHaveBeenCalledWith(['unit-1', 'unit-2']);
    expect(t.tasks.listTasksInJobs).toHaveBeenCalledWith(['a', 'b', 'c']);
    expect(t.evaluations.listEvaluationsByJob).toHaveBeenCalledWith(['unit-1', 'unit-2']);
  });

  it('puts each Task under its Job, in order, with the summary of a finished Task', async () => {
    const t = setup();

    const progress = await t.service.getWorkflowProgress('wf-1');

    expect(progress.unitsOfWork[0].jobs[0].tasks).toEqual([]);
    expect(progress.unitsOfWork[1].jobs[0].tasks).toEqual([
      expect.objectContaining({ id: 't1', sequence: 1, status: 'complete', summary: 'Drafted the post.' }),
      expect.objectContaining({ id: 't2', sequence: 2, status: 'running', summary: null }),
    ]);
    expect(progress.unitsOfWork[1].jobs[0].tasks[0]).not.toHaveProperty('reviewedAt');
  });

  it('leaves internal fields out of the response', async () => {
    const t = setup();

    const progress = await t.service.getWorkflowProgress('wf-1');

    expect(progress.strategy).not.toHaveProperty('owner');
    expect(progress.strategy).not.toHaveProperty('goldStandards');
    expect(progress.unitsOfWork[0]).not.toHaveProperty('state');
    expect(progress.unitsOfWork[0].jobs[0]).not.toHaveProperty('reviewingAttempts');
    expect(progress.unitsOfWork[0].jobs[0].evaluation).not.toHaveProperty('attempts');
  });

  it('answers 404 for an unknown Workflow', async () => {
    const t = setup(null);

    await expect(t.service.getWorkflowProgress('wf-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(t.unitsOfWork.listUnitsOfWork).not.toHaveBeenCalled();
  });
});
