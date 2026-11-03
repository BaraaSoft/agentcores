import type { StrategyWorkType, UnitOfWorkStatus } from '@ahe/agent-core';
import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { JobEvaluationService } from '../../governance/services/job-evaluation.service';
import { STALE_SCREENSHOT_AGE_MS } from '../../governance/services/job-screenshot.constants';
import type { JobScreenshotService } from '../../governance/services/job-screenshot.service';
import type { JobService } from '../../governance/services/job.service';
import type { TaskService } from '../../governance/services/task.service';
import type { UnitOfWorkService } from '../../governance/services/unit-of-work.service';
import type { JobEvaluationJobData } from '../../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../../queue/types/job-execution-job-data';
import type { StrategyReasoningService } from '../../reasoning/strategy/strategy-reasoning.service';
import type { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import type { WorkflowService } from '../../workflow/workflow.service';
import { CONTINUOUS_EVALUATION_DELAY_MS, INTERRUPTED_TASK_REASON, SCHEDULING_INTERVAL_MS, STUCK_TASK_MS } from '../orchestrator.constants';
import { OrchestratorService } from '../orchestrator.service';

const NOW = new Date('2026-10-30T10:00:00Z');
const PLAN = {
  decision: 'plan' as const,
  title: 'One clean cut',
  rationale: 'Start simple.',
  jobs: [{ name: 'Cut', objective: 'Cut the footage', orderType: 'ordered' as const }],
};

interface FakeUnitOfWork {
  id: string;
  name: string;
  status: UnitOfWorkStatus;
  evaluateAfter: Date | null;
}

function setup(workType: StrategyWorkType, strategyChanges: Record<string, unknown> = {}) {
  const strategy = {
    id: 'strategy-1',
    owner: 'owner-1',
    name: 'Launch',
    objective: 'Launch AHE',
    workType,
    versionCount: workType === 'multi_version' ? 2 : null,
    maxAttempts: 3,
    ...strategyChanges,
  };
  const workflow = {
    id: 'wf-1',
    strategyId: strategy.id,
    machineId: 'Macbook',
    state: 'running',
    strategy,
    resources: { maxConcurrentJobs: 2 },
  } as unknown as WorkflowEntity;

  const unitsOfWorkList: FakeUnitOfWork[] = [];
  const earlierRunUnits: Array<FakeUnitOfWork & { workflowId: string; title: string; rationale: string }> = [];
  const unitsOfWork = {
    listUnitsOfWork: jest.fn(async () => unitsOfWorkList.map((unit) => ({ ...unit }))),
    listEarlierRunUnitsOfWork: jest.fn(async () => earlierRunUnits.map((unit) => ({ ...unit }))),
    setRunState: jest.fn().mockResolvedValue(undefined),
    listUnitsOfWorkDueForEvaluation: jest.fn(async (_workflowId: string, now: Date) =>
      unitsOfWorkList.filter((unit) => unit.status === 'evaluating' && unit.evaluateAfter !== null && unit.evaluateAfter <= now),
    ),
    markEvaluating: jest.fn(async (id: string, evaluateAfter: Date) => {
      const unit = unitsOfWorkList.find((u) => u.id === id && u.status === 'open');
      if (unit === undefined) return false;
      Object.assign(unit, { status: 'evaluating', evaluateAfter });
      return true;
    }),
    markComplete: jest.fn(async (id: string) => {
      const unit = unitsOfWorkList.find((u) => u.id === id && u.status === 'evaluating');
      if (unit === undefined) return false;
      unit.status = 'complete';
      return true;
    }),
    createUnitOfWork: jest.fn(async ({ sequence, name }: { sequence: number; name: string }) => {
      const unit: FakeUnitOfWork = { id: `unit-${sequence}`, name, status: 'open', evaluateAfter: null };
      unitsOfWorkList.push(unit);
      return unit;
    }),
  };
  const addUnitOfWork = (status: UnitOfWorkStatus, evaluateAfter: Date | null = null) => {
    const sequence = unitsOfWorkList.length + 1;
    const unit = { id: `unit-${sequence}`, name: `Unit ${sequence}`, status, evaluateAfter };
    unitsOfWorkList.push(unit);
    return unit;
  };
  const addEarlierRunUnit = (workflowId: string, name: string, title = `Idea of ${name}`) => {
    earlierRunUnits.push({ id: `${workflowId}-${name}`, workflowId, name, title, rationale: '', status: 'complete', evaluateAfter: null });
  };

  const jobs = {
    skipStepsAfterFailure: jest.fn().mockResolvedValue(0),
    countUnitJobs: jest.fn().mockResolvedValue({ total: 2, open: 1 }),
    listJobsToEvaluate: jest.fn().mockResolvedValue([]),
    listJobsInUnits: jest.fn().mockResolvedValue([]),
    countActiveJobs: jest.fn().mockResolvedValue(0),
    listStartableJobs: jest.fn().mockResolvedValue([]),
  };
  const evaluations = {
    createEvaluation: jest.fn(async ({ jobId }: { jobId: string }) => ({ id: `eval-${jobId}`, state: 'evaluating' })),
    listScoredByJob: jest.fn().mockResolvedValue(new Map()),
    searchPastEvaluations: jest.fn().mockResolvedValue([]),
  };
  const strategyReasoning = { planUnitOfWork: jest.fn().mockResolvedValue(PLAN) };
  const jobQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const evaluationQueue = { add: jest.fn().mockResolvedValue(undefined) };

  const workflows = {
    listWorkflowsByState: jest.fn().mockResolvedValue([]),
    findWorkflowById: jest.fn(),
    updateWorkflowState: jest.fn(async ({ workflowId, state }: { workflowId: string; state: string }) => ({ id: workflowId, state })),
  };
  const screenshots = { deleteScreenshotsOlderThan: jest.fn().mockResolvedValue(0) };
  const tasks = { listStrayRunningTasks: jest.fn().mockResolvedValue([]), failInterruptedTasks: jest.fn().mockResolvedValue(0) };

  const service = new OrchestratorService(
    workflows as unknown as WorkflowService,
    strategyReasoning as unknown as StrategyReasoningService,
    unitsOfWork as unknown as UnitOfWorkService,
    jobs as unknown as JobService,
    evaluations as unknown as JobEvaluationService,
    jobQueue as unknown as Queue<JobExecutionJobData>,
    evaluationQueue as unknown as Queue<JobEvaluationJobData>,
    screenshots as unknown as JobScreenshotService,
    tasks as unknown as TaskService,
  );
  const schedule = (now = NOW) => service.scheduleWorkflow(workflow, now);

  return {
    service,
    workflow,
    workflows,
    screenshots,
    tasks,
    schedule,
    addUnitOfWork,
    addEarlierRunUnit,
    unitsOfWorkList,
    unitsOfWork,
    jobs,
    evaluations,
    strategyReasoning,
    jobQueue,
    evaluationQueue,
  };
}

describe('OrchestratorService', () => {
  describe('starting a Workflow', () => {
    const running = (id: string, machineId: string) => ({ id, machineId, state: 'running' });

    it('pauses the other running Workflow on the same machine before it starts', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue({ id: 'wf-2', machineId: 'Macbook' });
      t.workflows.listWorkflowsByState.mockResolvedValue([running('wf-1', 'Macbook')]);

      await t.service.startWorkflow('wf-2');

      expect(t.workflows.updateWorkflowState.mock.calls.map(([input]) => input)).toEqual([
        { workflowId: 'wf-1', state: 'paused' },
        { workflowId: 'wf-2', state: 'running' },
      ]);
    });

    it('leaves running Workflows on other machines alone, and never pauses the one it starts', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue({ id: 'wf-2', machineId: 'Macbook' });
      t.workflows.listWorkflowsByState.mockResolvedValue([running('wf-1', 'Mac mini'), running('wf-2', 'Macbook')]);

      await t.service.startWorkflow('wf-2');

      expect(t.workflows.updateWorkflowState.mock.calls.map(([input]) => input)).toEqual([{ workflowId: 'wf-2', state: 'running' }]);
    });

    it('pauses the Units of Work of the other run, and resumes the Units of Work of the one it starts', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockImplementation(async (id: string) => ({
        id,
        machineId: 'Macbook',
        state: id === 'wf-1' ? 'running' : 'paused',
      }));
      t.workflows.listWorkflowsByState.mockResolvedValue([running('wf-1', 'Macbook')]);

      await t.service.startWorkflow('wf-2');

      expect(t.unitsOfWork.setRunState.mock.calls).toEqual([
        ['wf-1', 'paused'],
        ['wf-2', 'running'],
      ]);
    });

    it('refuses to start a done run, and pauses nothing', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue({ id: 'wf-2', machineId: 'Macbook', state: 'done' });
      t.workflows.listWorkflowsByState.mockResolvedValue([running('wf-1', 'Macbook')]);

      await expect(t.service.startWorkflow('wf-2')).rejects.toThrow('This run is done. Run the strategy again to start a fresh one.');
      expect(t.workflows.updateWorkflowState).not.toHaveBeenCalled();
      expect(t.unitsOfWork.setRunState).not.toHaveBeenCalled();
    });

    it('answers 404 for a Workflow that does not exist', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue(null);

      await expect(t.service.startWorkflow('wf-x')).rejects.toThrow('Workflow wf-x not found');
    });
  });

  describe('pausing a Workflow', () => {
    it('pauses the Workflow and every Unit of Work in it, so its queued Jobs and Tasks stop', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue({ id: 'wf-1', machineId: 'Macbook', state: 'running' });

      await t.service.pauseWorkflow('wf-1');

      expect(t.unitsOfWork.setRunState).toHaveBeenCalledWith('wf-1', 'paused');
      expect(t.workflows.updateWorkflowState).toHaveBeenCalledWith({ workflowId: 'wf-1', state: 'paused' });
    });

    it('leaves a done run done', async () => {
      const t = setup('one_off');
      t.workflows.findWorkflowById.mockResolvedValue({ id: 'wf-1', machineId: 'Macbook', state: 'done' });

      expect(await t.service.pauseWorkflow('wf-1')).toMatchObject({ state: 'done' });
      expect(t.workflows.updateWorkflowState).not.toHaveBeenCalled();
      expect(t.unitsOfWork.setRunState).not.toHaveBeenCalled();
    });
  });

  describe('the screenshot sweep', () => {
    it('deletes the screenshots of Jobs untouched for two days on every pass', async () => {
      const t = setup('one_off');
      const before = Date.now();

      await t.service.scheduleAllWorkflows();

      const cutoff = t.screenshots.deleteScreenshotsOlderThan.mock.calls[0][0] as Date;
      expect(before - cutoff.getTime()).toBeGreaterThanOrEqual(STALE_SCREENSHOT_AGE_MS - 1000);
      expect(before - cutoff.getTime()).toBeLessThanOrEqual(STALE_SCREENSHOT_AGE_MS + 1000);
    });

    it('never fails the pass when the sweep fails', async () => {
      const t = setup('one_off');
      t.screenshots.deleteScreenshotsOlderThan.mockRejectedValue(new Error('EACCES'));

      await expect(t.service.scheduleAllWorkflows()).resolves.toEqual([]);
    });
  });

  describe('start-up', () => {
    afterEach(() => jest.useRealTimers());

    it('ends the Tasks a stop or a crash cut off before the first pass, so Job review plans from there', async () => {
      jest.useFakeTimers();
      const t = setup('one_off');
      t.tasks.failInterruptedTasks.mockResolvedValue(1);
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await t.service.onApplicationBootstrap();

      expect(t.tasks.failInterruptedTasks).toHaveBeenCalledWith(INTERRUPTED_TASK_REASON);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ended 1 Task that ran when the backend stopped'));
      expect(t.workflows.listWorkflowsByState).not.toHaveBeenCalled();
      t.service.onApplicationShutdown();
      warn.mockRestore();
    });

    it('still starts the scheduling loop when the repair fails', async () => {
      jest.useFakeTimers();
      const t = setup('one_off');
      t.tasks.failInterruptedTasks.mockRejectedValue(new Error('connection lost'));
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await t.service.onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(SCHEDULING_INTERVAL_MS);

      expect(t.workflows.listWorkflowsByState).toHaveBeenCalledWith('running');
      t.service.onApplicationShutdown();
      warn.mockRestore();
    });
  });

  describe('the stray Task check', () => {
    const stray = {
      taskId: 'task-1',
      action: 'Post the draft',
      startedAt: new Date(),
      taskWorkflowId: 'wf-1',
      jobId: 'job-1',
      jobName: 'Post',
      jobOutcome: 'success',
      unitOfWorkId: 'unit-1',
      unitOfWorkName: 'Attempt 1',
      unitOfWorkState: 'running',
      workflowId: 'wf-1',
      workflowState: 'running',
      workflowUpdatedAt: new Date(),
    };

    it('logs each running Task that does not belong to running work, on every pass', async () => {
      const t = setup('one_off');
      t.tasks.listStrayRunningTasks.mockResolvedValue([stray]);
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await t.service.scheduleAllWorkflows();

      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('[stray-task] Task task-1 "Post the draft" is running, but its Job is closed (success).'),
      );
      error.mockRestore();
    });

    it('asks only for Tasks started before the stuck limit to count as stuck', async () => {
      const t = setup('one_off');
      const before = Date.now();

      await t.service.scheduleAllWorkflows();

      const stuckBefore = t.tasks.listStrayRunningTasks.mock.calls[0][0] as Date;
      expect(before - stuckBefore.getTime()).toBeGreaterThanOrEqual(STUCK_TASK_MS - 1000);
      expect(before - stuckBefore.getTime()).toBeLessThanOrEqual(STUCK_TASK_MS + 1000);
    });

    it('never fails the pass when the check fails', async () => {
      const t = setup('one_off');
      t.tasks.listStrayRunningTasks.mockRejectedValue(new Error('connection lost'));

      await expect(t.service.scheduleAllWorkflows()).resolves.toEqual([]);
    });
  });

  describe('opening a Unit of Work', () => {
    it.each([
      ['continuous', 'Round 1'],
      ['one_off', 'Attempt 1'],
      ['multi_version', 'Version 1'],
    ] as const)('opens the first Unit of Work of a %s Strategy as "%s"', async (workType, name) => {
      const t = setup(workType);

      await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({ unitOfWorkName: name, workType, canFinish: false, earlierUnitsOfWork: [] }),
      );
      expect(t.unitsOfWork.createUnitOfWork).toHaveBeenCalledWith({
        strategyId: 'strategy-1',
        workflowId: 'wf-1',
        sequence: 1,
        name,
        title: 'One clean cut',
        rationale: 'Start simple.',
        jobs: PLAN.jobs,
      });
    });

    it('shows the planner the idea each earlier Unit of Work tested and why', async () => {
      const t = setup('one_off');
      Object.assign(t.addUnitOfWork('complete'), { title: 'Long intro', rationale: 'Tell the full story first.' });

      await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          earlierUnitsOfWork: [expect.objectContaining({ name: 'Unit 1', title: 'Long intro', rationale: 'Tell the full story first.' })],
        }),
      );
    });

    it('starts a fresh run at the first Unit, and shows the planner what the earlier runs learned', async () => {
      const t = setup('one_off');
      t.addEarlierRunUnit('wf-old-1', 'Attempt 1', 'Long intro');
      t.addEarlierRunUnit('wf-old-1', 'Attempt 2', 'Hook first');
      t.addEarlierRunUnit('wf-old-2', 'Attempt 1', 'Captions');

      await t.schedule();

      expect(t.unitsOfWork.listEarlierRunUnitsOfWork).toHaveBeenCalledWith('strategy-1', 'wf-1');
      expect(t.strategyReasoning.planUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          unitOfWorkName: 'Attempt 1',
          earlierUnitsOfWork: [],
          earlierRuns: [
            {
              runNumber: 1,
              unitsOfWork: [expect.objectContaining({ title: 'Long intro' }), expect.objectContaining({ title: 'Hook first' })],
            },
            { runNumber: 2, unitsOfWork: [expect.objectContaining({ title: 'Captions' })] },
          ],
        }),
      );
      expect(t.unitsOfWork.createUnitOfWork).toHaveBeenCalledWith(expect.objectContaining({ workflowId: 'wf-1', sequence: 1 }));
    });

    it('shows the planner only the latest earlier runs', async () => {
      const t = setup('continuous');
      for (const run of ['a', 'b', 'c', 'd']) t.addEarlierRunUnit(`wf-${run}`, 'Round 1');

      await t.schedule();

      const [input] = t.strategyReasoning.planUnitOfWork.mock.calls[0];
      expect(input.earlierRuns.map((run: { runNumber: number }) => run.runNumber)).toEqual([2, 3, 4]);
    });

    it('leaves the earlier runs out of the related evaluations', async () => {
      const t = setup('one_off');
      t.addEarlierRunUnit('wf-old', 'Attempt 1');
      t.evaluations.searchPastEvaluations.mockResolvedValue([
        { unitOfWorkId: 'wf-old-Attempt 1', jobId: 'own', score: 9, job: { name: 'Own', outcomeStatus: 'success' } },
        { unitOfWorkId: 'other-unit', jobId: 'other', score: 7, job: { name: 'Other', outcomeStatus: 'success' } },
      ]);

      await t.schedule();

      const [input] = t.strategyReasoning.planUnitOfWork.mock.calls[0];
      expect(input.relatedEvaluations.map((evaluation: { jobId: string }) => evaluation.jobId)).toEqual(['other']);
    });

    it('opens nothing while a Unit of Work is still open', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('open');

      await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).not.toHaveBeenCalled();
    });

    it('opens the next round of continuous work while the last round waits to be evaluated', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('evaluating', new Date(NOW.getTime() + 1000));

      await t.schedule();

      expect(t.unitsOfWork.createUnitOfWork).toHaveBeenCalledWith(expect.objectContaining({ sequence: 2, name: 'Round 2' }));
    });

    it.each(['one_off', 'multi_version'] as const)(
      'makes %s work wait while the last Unit of Work is being evaluated',
      async (workType) => {
        const t = setup(workType);
        t.addUnitOfWork('evaluating', null);

        await t.schedule();

        expect(t.strategyReasoning.planUnitOfWork).not.toHaveBeenCalled();
        expect(t.workflows.updateWorkflowState).not.toHaveBeenCalled();
      },
    );

    it('lets the planner finish a one_off run after its first attempt', async () => {
      const t = setup('one_off');
      t.addUnitOfWork('complete');
      t.strategyReasoning.planUnitOfWork.mockResolvedValue({ decision: 'done', rationale: 'Marked 9/10.' });

      const result = await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({ unitOfWorkName: 'Attempt 2', canFinish: true }),
      );
      expect(t.workflows.updateWorkflowState).toHaveBeenCalledWith({ workflowId: 'wf-1', state: 'done' });
      expect(t.unitsOfWork.createUnitOfWork).not.toHaveBeenCalled();
      expect(result.skippedReason).toBe('run done');
    });

    it('marks a one_off run done once it has used its attempts', async () => {
      const t = setup('one_off', { maxAttempts: 2 });
      t.addUnitOfWork('complete');
      t.addUnitOfWork('complete');

      await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).not.toHaveBeenCalled();
      expect(t.workflows.updateWorkflowState).toHaveBeenCalledWith({ workflowId: 'wf-1', state: 'done' });
    });

    it('marks a multi_version run done once every version is done, failed ones included', async () => {
      const t = setup('multi_version');
      t.addUnitOfWork('complete');
      t.addUnitOfWork('complete');

      await t.schedule();

      expect(t.strategyReasoning.planUnitOfWork).not.toHaveBeenCalled();
      expect(t.workflows.updateWorkflowState).toHaveBeenCalledWith({ workflowId: 'wf-1', state: 'done' });
    });

    it('never marks a continuous run done, however many rounds it has run', async () => {
      const t = setup('continuous');
      for (let round = 0; round < 5; round += 1) t.addUnitOfWork('complete');

      await t.schedule();

      expect(t.unitsOfWork.createUnitOfWork).toHaveBeenCalledWith(expect.objectContaining({ sequence: 6, name: 'Round 6' }));
      expect(t.workflows.updateWorkflowState).not.toHaveBeenCalled();
    });

    it.each(['paused', 'done'] as const)('does nothing for a %s run', async (state) => {
      const t = setup('one_off');
      Object.assign(t.workflow, { state });

      const result = await t.schedule();

      expect(t.unitsOfWork.listUnitsOfWork).not.toHaveBeenCalled();
      expect(result).toEqual({ workflowId: 'wf-1', queuedJobIds: [], skippedReason: `run ${state}` });
    });
  });

  describe('settling and evaluating a Unit of Work', () => {
    it('skips the steps behind a failure, and keeps the Unit of Work open while a Job is open', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('open');

      await t.schedule();

      expect(t.jobs.skipStepsAfterFailure).toHaveBeenCalledWith('unit-1');
      expect(t.unitsOfWork.markEvaluating).not.toHaveBeenCalled();
    });

    it('evaluates finished continuous work 24 hours later', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('open');
      t.jobs.countUnitJobs.mockResolvedValue({ total: 2, open: 0 });

      await t.schedule();

      expect(t.unitsOfWork.markEvaluating).toHaveBeenCalledWith('unit-1', new Date(NOW.getTime() + CONTINUOUS_EVALUATION_DELAY_MS));
      expect(t.evaluations.createEvaluation).not.toHaveBeenCalled();
    });

    it('evaluates a finished one_off attempt in the same pass, and waits for the evaluations before planning again', async () => {
      const t = setup('one_off');
      t.addUnitOfWork('open');
      t.jobs.countUnitJobs.mockResolvedValue({ total: 1, open: 0 });
      t.jobs.listJobsToEvaluate.mockResolvedValue([{ id: 'job-1' }]);

      await t.schedule();

      expect(t.unitsOfWork.markEvaluating).toHaveBeenCalledWith('unit-1', NOW);
      expect(t.evaluations.createEvaluation).toHaveBeenCalledWith({ owner: 'owner-1', jobId: 'job-1', unitOfWorkId: 'unit-1' });
      expect(t.evaluationQueue.add).toHaveBeenCalledWith(
        'eval-job-1',
        { workflowId: 'wf-1', evaluationId: 'eval-job-1' },
        { jobId: 'eval-job-1' },
      );
      expect(t.unitsOfWork.markComplete).not.toHaveBeenCalled();
      expect(t.strategyReasoning.planUnitOfWork).not.toHaveBeenCalled();
    });

    it('never moves a Unit of Work with no Jobs to evaluating', async () => {
      const t = setup('one_off');
      t.addUnitOfWork('open');
      t.jobs.countUnitJobs.mockResolvedValue({ total: 0, open: 0 });

      await t.schedule();

      expect(t.unitsOfWork.markEvaluating).not.toHaveBeenCalled();
    });

    it('completes a Unit of Work once every evaluation has settled, and does not queue settled ones again', async () => {
      const t = setup('multi_version');
      t.addUnitOfWork('evaluating', NOW);
      t.jobs.listJobsToEvaluate.mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]);
      t.evaluations.createEvaluation.mockImplementation(async ({ jobId }) => ({
        id: `eval-${jobId}`,
        state: jobId === 'job-1' ? 'scored' : 'failed',
      }));

      await t.schedule();

      expect(t.evaluationQueue.add).not.toHaveBeenCalled();
      expect(t.unitsOfWork.markComplete).toHaveBeenCalledWith('unit-1');
      expect(t.unitsOfWork.createUnitOfWork).toHaveBeenCalledWith(expect.objectContaining({ sequence: 2, name: 'Version 2' }));
    });

    it('keeps the Unit of Work evaluating while an evaluation waits for its evidence', async () => {
      const t = setup('one_off');
      t.addUnitOfWork('evaluating', NOW);
      t.jobs.listJobsToEvaluate.mockResolvedValue([{ id: 'job-1' }]);
      t.evaluations.createEvaluation.mockResolvedValue({ id: 'eval-job-1', state: 'awaiting_evidence' });

      await t.schedule();

      expect(t.evaluationQueue.add).not.toHaveBeenCalled();
      expect(t.unitsOfWork.markComplete).not.toHaveBeenCalled();
    });

    it('does not evaluate a Unit of Work before its wait is over', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('evaluating', new Date(NOW.getTime() + 1000));

      await t.schedule();

      expect(t.jobs.listJobsToEvaluate).not.toHaveBeenCalled();
    });
  });

  describe('starting Jobs', () => {
    it('queues the ready Jobs up to the Job limit, keyed by Job ID', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('open');
      t.jobs.countActiveJobs.mockResolvedValue(1);
      t.jobs.listStartableJobs.mockResolvedValue([{ id: 'job-1' }]);

      const result = await t.schedule();

      expect(t.jobs.listStartableJobs).toHaveBeenCalledWith({ workflowId: 'wf-1', limit: 1 });
      expect(t.jobQueue.add).toHaveBeenCalledWith('job-1', { workflowId: 'wf-1', jobId: 'job-1' }, { jobId: 'job-1' });
      expect(result).toEqual({ workflowId: 'wf-1', queuedJobIds: ['job-1'], skippedReason: null });
    });

    it('starts nothing at the Job limit', async () => {
      const t = setup('continuous');
      t.addUnitOfWork('open');
      t.jobs.countActiveJobs.mockResolvedValue(2);

      const result = await t.schedule();

      expect(t.jobs.listStartableJobs).not.toHaveBeenCalled();
      expect(result.skippedReason).toBe('at Job limit');
    });
  });
});
