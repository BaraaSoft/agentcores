import type { StrategyWorkType } from '@ahe/agent-core';
import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { StrategyEntity } from '../governance/entities/strategy.entity';
import type { UnitOfWorkEntity } from '../governance/entities/unit-of-work.entity';
import { JobEvaluationService } from '../governance/services/job-evaluation.service';
import { STALE_SCREENSHOT_AGE_MS } from '../governance/services/job-screenshot.constants';
import { JobScreenshotService } from '../governance/services/job-screenshot.service';
import { JobService } from '../governance/services/job.service';
import { TaskService } from '../governance/services/task.service';
import { UnitOfWorkService } from '../governance/services/unit-of-work.service';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../queue/queue.constants';
import type { JobEvaluationJobData } from '../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../queue/types/job-execution-job-data';
import type { JobEvaluation } from '../reasoning/evaluation/types/job-evaluation';
import { StrategyReasoningService } from '../reasoning/strategy/strategy-reasoning.service';
import type { EarlierRun } from '../reasoning/strategy/types/earlier-run';
import type { EarlierUnitOfWork } from '../reasoning/strategy/types/earlier-unit-of-work';
import type { PlanUnitOfWorkInput } from '../reasoning/strategy/types/plan-unit-of-work-input';
import type { WorkflowEntity } from '../workflow/entities/workflow.entity';
import { WorkflowService } from '../workflow/workflow.service';
import {
  CONTINUOUS_EVALUATION_DELAY_MS,
  EARLIER_RUN_UNITS_OF_WORK_LIMIT,
  EARLIER_RUNS_LIMIT,
  EARLIER_UNITS_OF_WORK_LIMIT,
  INTERRUPTED_TASK_REASON,
  RELATED_EVALUATIONS_LIMIT,
  SCHEDULING_INTERVAL_MS,
  STUCK_TASK_MS,
  UNIT_OF_WORK_NAME_PREFIXES,
} from './orchestrator.constants';
import { describeStrayTask } from './describe-stray-task';
import type { SchedulingResult } from './types/scheduling-result';

/** Why the pass opened no new Unit of Work: one is still open, the stop rule says wait, or the run just finished. */
type NextUnitOfWork = 'opened' | 'open' | 'waiting' | 'done';

/**
 * The AHE runtime's control plane. A Strategy is a reusable goal and each Workflow is one run of it.
 * Every minute it moves each running Workflow forward one step — settles the open Unit of Work,
 * evaluates the Units of Work that are due, opens the next one when the work type's stop rule allows,
 * or marks the run `done` — and starts the Jobs that are ready, within the Workflow's Job limit. It is
 * the only place that creates Units of Work and the only place that starts an evaluation. It never
 * queues Tasks: a queued Job queues its own Tasks, one at a time. `tech-spec.md` beside this file
 * explains the rules.
 */
@Injectable()
export class OrchestratorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OrchestratorService.name);
  private timer: NodeJS.Timeout | null = null;
  private currentPass: Promise<SchedulingResult[]> | null = null;

  constructor(
    private readonly workflows: WorkflowService,
    private readonly strategyReasoning: StrategyReasoningService,
    private readonly unitsOfWork: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly evaluations: JobEvaluationService,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
    @InjectQueue(JOB_EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue<JobEvaluationJobData>,
    private readonly screenshots: JobScreenshotService,
    private readonly tasks: TaskService,
  ) {}

  /**
   * Ends the Tasks a stop or a crash cut off, then starts the scheduling loop.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.failInterruptedTasks();
    this.timer = setInterval(() => void this.runScheduledPass(), SCHEDULING_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  /**
   * Sets a Workflow `running`, with its Units of Work, and starts a pass straight away, without waiting
   * for it: planning the first Unit of Work can take a while. Any other running Workflow on the same
   * machine is paused first. A `done` Workflow is final and cannot start: run the Strategy again instead.
   */
  async startWorkflow(workflowId: string): Promise<WorkflowEntity> {
    const target = await this.findWorkflow(workflowId);
    if (target.state === 'done') throw new ConflictException('This run is done. Run the strategy again to start a fresh one.');
    await this.pauseOthersOnMachine(target);
    await this.unitsOfWork.setRunState(workflowId, 'running');
    const workflow = await this.workflows.updateWorkflowState({ workflowId, state: 'running' });
    void this.runScheduledPass();
    return workflow;
  }

  /**
   * Pauses a Workflow and every Unit of Work in it. The pass skips it from now on; queued Jobs and
   * Tasks are skipped by the processors, and a running Task stops before its next step, so the machine
   * is free once that step ends. Everything moves again once the Workflow is started. A `done` Workflow
   * stays `done`.
   */
  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
    const target = await this.findWorkflow(workflowId);
    if (target.state === 'done') return target;
    await this.unitsOfWork.setRunState(workflowId, 'paused');
    return this.workflows.updateWorkflowState({ workflowId, state: 'paused' });
  }

  /**
   * One scheduling pass over every running Workflow. A pass never overlaps the one before it: asking
   * for one while it runs returns the pass already under way. An error on one Workflow is logged and
   * the pass goes on to the next.
   */
  async scheduleAllWorkflows(): Promise<SchedulingResult[]> {
    this.currentPass ??= this.passOverWorkflows().finally(() => {
      this.currentPass = null;
    });
    return this.currentPass;
  }

  /**
   * One step for one Workflow, in this order: settle the open Unit of Work, evaluate the Units of Work
   * that are due, open the next one if the stop rule allows, then start the ready Jobs.
   */
  async scheduleWorkflow(workflow: WorkflowEntity, now = new Date()): Promise<SchedulingResult> {
    if (workflow.state !== 'running') return this.result(workflow, [], `run ${workflow.state}`);

    await this.settleOpenUnitOfWork(workflow, now);
    await this.evaluateDueUnitsOfWork(workflow, now);
    if ((await this.openNextUnitOfWork(workflow)) === 'done') return this.result(workflow, [], 'run done');

    const capacity = workflow.resources.maxConcurrentJobs - (await this.jobs.countActiveJobs(workflow.id));
    if (capacity <= 0) return this.result(workflow, [], 'at Job limit');
    const ready = await this.jobs.listStartableJobs({ workflowId: workflow.id, limit: capacity });
    for (const job of ready) {
      await this.jobQueue.add(job.id, { workflowId: workflow.id, jobId: job.id }, { jobId: job.id });
    }
    return this.result(
      workflow,
      ready.map((job) => job.id),
      ready.length === 0 ? 'no Job ready' : null,
    );
  }

  /**
   * A machine runs one Workflow at a time. The agent controls its screen, so a second Workflow would act
   * in the middle of the first one's work.
   */
  private async pauseOthersOnMachine(target: WorkflowEntity): Promise<void> {
    for (const other of await this.workflows.listWorkflowsByState('running')) {
      if (other.id === target.id || other.machineId !== target.machineId) continue;
      await this.pauseWorkflow(other.id);
      this.logger.log(`Paused Workflow ${other.id}: Workflow ${target.id} starts on ${target.machineId}`);
    }
  }

  private async findWorkflow(workflowId: string): Promise<WorkflowEntity> {
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow === null) throw new NotFoundException(`Workflow ${workflowId} not found`);
    return workflow;
  }

  private async runScheduledPass(): Promise<void> {
    try {
      await this.scheduleAllWorkflows();
    } catch (error) {
      this.logger.error(`Scheduling pass failed: ${this.describe(error)}`);
    }
  }

  private async passOverWorkflows(): Promise<SchedulingResult[]> {
    const results: SchedulingResult[] = [];
    for (const workflow of await this.workflows.listWorkflowsByState('running')) {
      try {
        results.push(await this.scheduleWorkflow(workflow));
      } catch (error) {
        this.logger.error(`Scheduling Workflow ${workflow.id} failed: ${this.describe(error)}`);
        results.push(this.result(workflow, [], `error: ${this.describe(error)}`));
      }
    }
    await this.sweepStaleScreenshots();
    await this.reportStrayRunningTasks();
    return results;
  }

  /**
   * A Task still `running` at start-up holds its Job forever, because nothing will finish it. Ending it
   * `failed` makes it a finished Task awaiting review, so the next pass queues its Job and Job review plans
   * from the state it left. A failed repair is logged and never stops the start-up.
   */
  private async failInterruptedTasks(): Promise<void> {
    try {
      const count = await this.tasks.failInterruptedTasks(INTERRUPTED_TASK_REASON);
      if (count > 0)
        this.logger.warn(`Ended ${count} Task${count === 1 ? '' : 's'} that ran when the backend stopped; Job review plans from there`);
    } catch (error) {
      this.logger.warn(`Interrupted Task repair failed: ${this.describe(error)}`);
    }
  }

  /**
   * Logs every `running` Task that does not belong to running work, so a stray one is easy to find: its
   * Job is closed, its run is paused or done, or it has run for too long. A failed check is logged and
   * never stops the pass.
   */
  private async reportStrayRunningTasks(): Promise<void> {
    try {
      const now = new Date();
      for (const task of await this.tasks.listStrayRunningTasks(new Date(now.getTime() - STUCK_TASK_MS))) {
        const { level, line } = describeStrayTask(task, now);
        if (level === 'warn') this.logger.warn(line);
        else this.logger.error(line);
      }
    } catch (error) {
      this.logger.warn(`Stray Task check failed: ${this.describe(error)}`);
    }
  }

  /**
   * A Job's screenshots are deleted once it is evaluated. This catches the rest: evidence Jobs, Jobs
   * whose evaluation never ran, and folders left by a crash. A failed sweep is logged and never stops the pass.
   */
  private async sweepStaleScreenshots(): Promise<void> {
    try {
      const deleted = await this.screenshots.deleteScreenshotsOlderThan(new Date(Date.now() - STALE_SCREENSHOT_AGE_MS));
      if (deleted > 0) this.logger.log(`Deleted the screenshots of ${deleted} old Jobs`);
    } catch (error) {
      this.logger.warn(`Screenshot sweep failed: ${this.describe(error)}`);
    }
  }

  /**
   * Step 2. Skips the ordered Jobs stuck behind one that did not succeed, then moves the open Unit of
   * Work to `evaluating` once every Job in it is closed.
   */
  private async settleOpenUnitOfWork(workflow: WorkflowEntity, now: Date): Promise<void> {
    const unitsOfWork = await this.unitsOfWork.listUnitsOfWork(workflow.id);
    const openUnitOfWork = unitsOfWork.find((unitOfWork) => unitOfWork.status === 'open');
    if (openUnitOfWork === undefined) return;
    await this.jobs.skipStepsAfterFailure(openUnitOfWork.id);
    const count = await this.jobs.countUnitJobs(openUnitOfWork.id);
    if (count.total === 0 || count.open > 0) return;
    const evaluateAfter = new Date(now.getTime() + this.evaluationDelay(workflow.strategy.workType));
    await this.unitsOfWork.markEvaluating(openUnitOfWork.id, evaluateAfter);
  }

  /**
   * Step 3. Opens one evaluation per Job of each Unit of Work that is due and queues it, then completes
   * the Unit of Work once every evaluation has settled. Repeating this is harmless: a Job has one
   * evaluation, and the queue job ID is the evaluation ID.
   */
  private async evaluateDueUnitsOfWork(workflow: WorkflowEntity, now: Date): Promise<void> {
    const workflowId = workflow.id;
    for (const unitOfWork of await this.unitsOfWork.listUnitsOfWorkDueForEvaluation(workflowId, now)) {
      let isSettled = true;
      for (const job of await this.jobs.listJobsToEvaluate(unitOfWork.id)) {
        const evaluation = await this.evaluations.createEvaluation({
          owner: workflow.strategy.owner,
          jobId: job.id,
          unitOfWorkId: unitOfWork.id,
        });
        if (evaluation.state === 'evaluating') {
          await this.evaluationQueue.add(evaluation.id, { workflowId, evaluationId: evaluation.id }, { jobId: evaluation.id });
        }
        if (evaluation.state === 'evaluating' || evaluation.state === 'awaiting_evidence') isSettled = false;
      }
      if (isSettled) await this.unitsOfWork.markComplete(unitOfWork.id);
    }
  }

  /**
   * Step 4. Opens the run's next Unit of Work, or marks the run `done` when no more work is needed.
   *
   * 1. A Unit of Work is still `open`: its Jobs still run, so do nothing (`'open'`).
   * 2. The stop rule of the work type, counted inside this run only:
   *    - `one_off` and `multi_version` wait while the last Unit of Work is `evaluating`, so the planner
   *      sees its scores (`'waiting'`). The run is `done` once its count of Units of Work reaches the
   *      limit: `maxAttempts` attempts for `one_off`, `versionCount` versions for `multi_version`.
   *    - `continuous` never waits and has no limit, so its run is never `done`. The next Unit of Work
   *      opens as soon as the Jobs of the last one close; the evaluation of the last one runs 24 hours
   *      later, beside the new one.
   * 3. The Strategy planner (`planUnitOfWork`, a model call) gets the objective, this run's last Units of
   *    Work with the outcome and score of each Job, the Strategy's earlier runs, and scored Jobs from the
   *    owner's other Strategies. It either answers `done` (only `one_off`, after the first attempt), which
   *    marks the run `done`, or returns the Jobs of the next Unit of Work.
   * 4. Saves the new Unit of Work as `open` with its Jobs, and the planner's `title` (the idea it tests)
   *    and `rationale` (why) (`'opened'`). Step 5 queues the ready Jobs.
   */
  private async openNextUnitOfWork(workflow: WorkflowEntity): Promise<NextUnitOfWork> {
    const { strategy } = workflow;
    const unitsOfWork = await this.unitsOfWork.listUnitsOfWork(workflow.id);
    if (unitsOfWork.some((unitOfWork) => unitOfWork.status === 'open')) return 'open';
    const isEvaluating = unitsOfWork.some((unitOfWork) => unitOfWork.status === 'evaluating');
    const namePrefix = UNIT_OF_WORK_NAME_PREFIXES[strategy.workType];

    if (strategy.workType !== 'continuous') {
      if (isEvaluating) return 'waiting';
      const limit = strategy.workType === 'one_off' ? strategy.maxAttempts : (strategy.versionCount ?? 0);
      if (unitsOfWork.length >= limit) return this.finishRun(workflow, `all ${limit} ${namePrefix.toLowerCase()}s are done`);
    }

    const sequence = unitsOfWork.length + 1;
    const name = `${namePrefix} ${sequence}`;
    const plan = await this.strategyReasoning.planUnitOfWork(await this.planInput(workflow, unitsOfWork, name));
    if (plan.decision === 'done') return this.finishRun(workflow, plan.rationale);

    await this.unitsOfWork.createUnitOfWork({
      strategyId: strategy.id,
      workflowId: workflow.id,
      sequence,
      name,
      title: plan.title,
      rationale: plan.rationale,
      jobs: plan.jobs,
    });
    this.logger.log(`Workflow ${workflow.id}: opened ${name} "${plan.title}" with ${plan.jobs.length} Jobs.`);
    return 'opened';
  }

  private async planInput(
    workflow: WorkflowEntity,
    unitsOfWork: readonly UnitOfWorkEntity[],
    unitOfWorkName: string,
  ): Promise<PlanUnitOfWorkInput> {
    const { strategy } = workflow;
    const earlierRunUnits = await this.unitsOfWork.listEarlierRunUnitsOfWork(strategy.id, workflow.id);
    return {
      strategyName: strategy.name,
      objective: strategy.objective,
      workType: strategy.workType,
      unitOfWorkName,
      unitOfWorkLimit: strategy.workType === 'one_off' ? strategy.maxAttempts : strategy.versionCount,
      canFinish: strategy.workType === 'one_off' && unitsOfWork.length > 0,
      earlierUnitsOfWork: await this.earlierUnitsOfWork(unitsOfWork.slice(-EARLIER_UNITS_OF_WORK_LIMIT)),
      earlierRuns: await this.earlierRuns(earlierRunUnits),
      relatedEvaluations: await this.relatedEvaluations(strategy, [...unitsOfWork, ...earlierRunUnits]),
    };
  }

  /**
   * The Strategy's latest earlier runs, oldest first, each with its latest Units of Work. Runs are
   * numbered in the order they started.
   */
  private async earlierRuns(earlierRunUnits: readonly UnitOfWorkEntity[]): Promise<EarlierRun[]> {
    const byRun = new Map<string, UnitOfWorkEntity[]>();
    for (const unitOfWork of earlierRunUnits) byRun.set(unitOfWork.workflowId, [...(byRun.get(unitOfWork.workflowId) ?? []), unitOfWork]);
    const runs = [...byRun.values()].map((units, index) => ({ runNumber: index + 1, units }));
    return Promise.all(
      runs.slice(-EARLIER_RUNS_LIMIT).map(async ({ runNumber, units }) => ({
        runNumber,
        unitsOfWork: await this.earlierUnitsOfWork(units.slice(-EARLIER_RUN_UNITS_OF_WORK_LIMIT)),
      })),
    );
  }

  /** The earlier Units of Work with the idea each tested, and each Job's outcome and evaluation, oldest first. */
  private async earlierUnitsOfWork(unitsOfWork: readonly UnitOfWorkEntity[]): Promise<EarlierUnitOfWork[]> {
    const unitOfWorkIds = unitsOfWork.map((unitOfWork) => unitOfWork.id);
    const [jobs, evaluations] = await Promise.all([
      this.jobs.listJobsInUnits(unitOfWorkIds),
      this.evaluations.listScoredByJob(unitOfWorkIds),
    ]);
    return unitsOfWork.map((unitOfWork) => ({
      name: unitOfWork.name,
      title: unitOfWork.title,
      rationale: unitOfWork.rationale,
      status: unitOfWork.status,
      jobs: jobs
        .filter((job) => job.unitOfWorkId === unitOfWork.id)
        .map((job) => {
          const evaluation = evaluations.get(job.id);
          return {
            name: job.name,
            objective: job.objective,
            orderType: job.orderType,
            outcomeStatus: job.outcomeStatus,
            outcomeSummary: job.outcomeSummary,
            evaluation:
              evaluation?.score == null
                ? null
                : { score: evaluation.score, whatGood: evaluation.whatGood, whatBad: evaluation.whatBad },
          };
        }),
    }));
  }

  /** Scored Jobs from the owner's other Strategies whose objective is close to this one's. This Strategy's own runs are left out: the planner already sees them. */
  private async relatedEvaluations(strategy: StrategyEntity, unitsOfWork: readonly UnitOfWorkEntity[]): Promise<JobEvaluation[]> {
    const ownUnitOfWorkIds = new Set(unitsOfWork.map((unitOfWork) => unitOfWork.id));
    const found = await this.evaluations.searchPastEvaluations({
      owner: strategy.owner,
      objective: strategy.objective,
      limit: RELATED_EVALUATIONS_LIMIT + ownUnitOfWorkIds.size * EARLIER_UNITS_OF_WORK_LIMIT,
    });
    return found
      .filter((evaluation) => !ownUnitOfWorkIds.has(evaluation.unitOfWorkId) && evaluation.score !== null)
      .slice(0, RELATED_EVALUATIONS_LIMIT)
      .map((evaluation) => ({
        jobId: evaluation.jobId,
        jobName: evaluation.job.name,
        outcomeStatus: evaluation.job.outcomeStatus,
        score: evaluation.score ?? 0,
        objectiveSummary: evaluation.objectiveSummary,
        whatGood: evaluation.whatGood,
        whatBad: evaluation.whatBad,
      }));
  }

  /** Marks the run `done`, which frees the machine. The Strategy stays as it is, ready to run again. */
  private async finishRun(workflow: WorkflowEntity, reason: string): Promise<NextUnitOfWork> {
    await this.workflows.updateWorkflowState({ workflowId: workflow.id, state: 'done' });
    this.logger.log(`Workflow ${workflow.id} done: ${reason}`);
    return 'done';
  }

  private evaluationDelay(workType: StrategyWorkType): number {
    return workType === 'continuous' ? CONTINUOUS_EVALUATION_DELAY_MS : 0;
  }

  private result(workflow: WorkflowEntity, queuedJobIds: readonly string[], skippedReason: string | null): SchedulingResult {
    return { workflowId: workflow.id, queuedJobIds, skippedReason };
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
