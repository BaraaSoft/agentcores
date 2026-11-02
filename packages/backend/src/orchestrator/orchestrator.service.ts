import type { StrategyWorkType } from '@ahe/agent-core';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { StrategyEntity } from '../governance/entities/strategy.entity';
import type { UnitOfWorkEntity } from '../governance/entities/unit-of-work.entity';
import { JobEvaluationService } from '../governance/services/job-evaluation.service';
import { STALE_SCREENSHOT_AGE_MS } from '../governance/services/job-screenshot.constants';
import { JobScreenshotService } from '../governance/services/job-screenshot.service';
import { JobService } from '../governance/services/job.service';
import { StrategyService } from '../governance/services/strategy.service';
import { UnitOfWorkService } from '../governance/services/unit-of-work.service';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../queue/queue.constants';
import type { JobEvaluationJobData } from '../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../queue/types/job-execution-job-data';
import type { JobEvaluation } from '../reasoning/evaluation/types/job-evaluation';
import { StrategyReasoningService } from '../reasoning/strategy/strategy-reasoning.service';
import type { EarlierUnitOfWork } from '../reasoning/strategy/types/earlier-unit-of-work';
import type { PlanUnitOfWorkInput } from '../reasoning/strategy/types/plan-unit-of-work-input';
import type { WorkflowEntity } from '../workflow/entities/workflow.entity';
import { WorkflowService } from '../workflow/workflow.service';
import {
  CONTINUOUS_EVALUATION_DELAY_MS,
  EARLIER_UNITS_OF_WORK_LIMIT,
  RELATED_EVALUATIONS_LIMIT,
  SCHEDULING_INTERVAL_MS,
  UNIT_OF_WORK_NAME_PREFIXES,
} from './orchestrator.constants';
import type { SchedulingResult } from './types/scheduling-result';

/** Why the pass opened no new Unit of Work: one is still open, the stop rule says wait, or the Strategy just completed. */
type NextUnitOfWork = 'opened' | 'open' | 'waiting' | 'complete';

/**
 * The AHE runtime's control plane. Every minute it moves each running Workflow's Strategy forward one
 * step — settles the open Unit of Work, evaluates the Units of Work that are due, opens the next one when
 * the work type's stop rule allows — and starts the Jobs that are ready, within the Workflow's Job limit.
 * It is the only place that creates Units of Work and the only place that starts an evaluation. It
 * never queues Tasks: a queued Job queues its own Tasks, one at a time. `tech-spec.md` beside this
 * file explains the rules.
 */
@Injectable()
export class OrchestratorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OrchestratorService.name);
  private timer: NodeJS.Timeout | null = null;
  private currentPass: Promise<SchedulingResult[]> | null = null;

  constructor(
    private readonly workflows: WorkflowService,
    private readonly strategyReasoning: StrategyReasoningService,
    private readonly strategies: StrategyService,
    private readonly unitsOfWork: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly evaluations: JobEvaluationService,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
    @InjectQueue(JOB_EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue<JobEvaluationJobData>,
    private readonly screenshots: JobScreenshotService,
  ) {}

  /**
   * Starts the scheduling loop.
   */
  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.runScheduledPass(), SCHEDULING_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  /**
   * Sets a Workflow `running` and starts a pass straight away, without waiting for it: planning the
   * first Unit of Work can take a while. Any other running Workflow on the same machine is paused first.
   */
  async startWorkflow(workflowId: string): Promise<WorkflowEntity> {
    await this.pauseOthersOnMachine(workflowId);
    const workflow = await this.workflows.updateWorkflowState({ workflowId, state: 'running' });
    void this.runScheduledPass();
    return workflow;
  }

  /**
   * Pauses a Workflow: the pass skips it from now on. A Task already running finishes; queued work is
   * skipped by the processors and moves again once the Workflow is running and the pass queues it.
   */
  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
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
    const { strategy } = workflow;
    if (strategy.status === 'complete') return this.result(workflow, [], 'Strategy complete');

    await this.settleOpenUnitOfWork(strategy, now);
    await this.evaluateDueUnitsOfWork(workflow.id, strategy, now);
    if ((await this.openNextUnitOfWork(strategy)) === 'complete') return this.result(workflow, [], 'Strategy complete');

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
  private async pauseOthersOnMachine(workflowId: string): Promise<void> {
    const target = await this.workflows.findWorkflowById(workflowId);
    if (target === null) return;
    for (const other of await this.workflows.listWorkflowsByState('running')) {
      if (other.id === workflowId || other.machineId !== target.machineId) continue;
      await this.workflows.updateWorkflowState({ workflowId: other.id, state: 'paused' });
      this.logger.log(`Paused Workflow ${other.id}: Workflow ${workflowId} starts on ${target.machineId}`);
    }
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
    return results;
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
  private async settleOpenUnitOfWork(strategy: StrategyEntity, now: Date): Promise<void> {
    const unitsOfWork = await this.unitsOfWork.listUnitsOfWork(strategy.id);
    const openUnitOfWork = unitsOfWork.find((unitOfWork) => unitOfWork.status === 'open');
    if (openUnitOfWork === undefined) return;
    await this.jobs.skipStepsAfterFailure(openUnitOfWork.id);
    const count = await this.jobs.countUnitJobs(openUnitOfWork.id);
    if (count.total === 0 || count.open > 0) return;
    const evaluateAfter = new Date(now.getTime() + this.evaluationDelay(strategy.workType));
    await this.unitsOfWork.markEvaluating(openUnitOfWork.id, evaluateAfter);
  }

  /**
   * Step 3. Opens one evaluation per Job of each Unit of Work that is due and queues it, then completes
   * the Unit of Work once every evaluation has settled. Repeating this is harmless: a Job has one
   * evaluation, and the queue job ID is the evaluation ID.
   */
  private async evaluateDueUnitsOfWork(workflowId: string, strategy: StrategyEntity, now: Date): Promise<void> {
    for (const unitOfWork of await this.unitsOfWork.listUnitsOfWorkDueForEvaluation(strategy.id, now)) {
      let isSettled = true;
      for (const job of await this.jobs.listJobsToEvaluate(unitOfWork.id)) {
        const evaluation = await this.evaluations.createEvaluation({
          owner: strategy.owner,
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
   * Step 4. Opens the next Unit of Work, or completes the Strategy when no more work is needed.
   *
   * 1. A Unit of Work is still `open`: its Jobs still run, so do nothing (`'open'`).
   * 2. The stop rule of the work type:
   *    - `one_off` and `multi_version` wait while the last Unit of Work is `evaluating`, so the planner
   *      sees its scores (`'waiting'`). They complete the Strategy once the count of Units of Work
   *      reaches the limit: `maxAttempts` attempts for `one_off`, `versionCount` versions for `multi_version`.
   *    - `continuous` never waits and has no limit. The next Unit of Work opens as soon as the Jobs of
   *      the last one close; the evaluation of the last one runs 24 hours later, beside the new one.
   * 3. The Strategy planner (`planUnitOfWork`, a model call) gets the objective, the last Units of Work with
   *    the outcome and score of each Job, and scored Jobs from the owner's other Strategies. It either
   *    answers `done` (only `one_off`, after the first attempt), which completes the Strategy, or returns
   *    the Jobs of the next Unit of Work.
   * 4. Saves the new Unit of Work as `open` with its Jobs, and the planner's `title` (the idea it tests)
   *    and `rationale` (why) (`'opened'`). Step 5 queues the ready Jobs.
   */
  private async openNextUnitOfWork(strategy: StrategyEntity): Promise<NextUnitOfWork> {
    const unitsOfWork = await this.unitsOfWork.listUnitsOfWork(strategy.id);
    if (unitsOfWork.some((unitOfWork) => unitOfWork.status === 'open')) return 'open';
    const isEvaluating = unitsOfWork.some((unitOfWork) => unitOfWork.status === 'evaluating');
    const namePrefix = UNIT_OF_WORK_NAME_PREFIXES[strategy.workType];

    if (strategy.workType !== 'continuous') {
      if (isEvaluating) return 'waiting';
      const limit = strategy.workType === 'one_off' ? strategy.maxAttempts : (strategy.versionCount ?? 0);
      if (unitsOfWork.length >= limit) return this.complete(strategy, `all ${limit} ${namePrefix.toLowerCase()}s are done`);
    }

    const sequence = unitsOfWork.length + 1;
    const name = `${namePrefix} ${sequence}`;
    const plan = await this.strategyReasoning.planUnitOfWork(await this.planInput(strategy, unitsOfWork, name));
    if (plan.decision === 'done') return this.complete(strategy, plan.rationale);

    await this.unitsOfWork.createUnitOfWork({
      strategyId: strategy.id,
      sequence,
      name,
      title: plan.title,
      rationale: plan.rationale,
      jobs: plan.jobs,
    });
    this.logger.log(`Strategy ${strategy.id}: opened ${name} "${plan.title}" with ${plan.jobs.length} Jobs.`);
    return 'opened';
  }

  private async planInput(
    strategy: StrategyEntity,
    unitsOfWork: readonly UnitOfWorkEntity[],
    unitOfWorkName: string,
  ): Promise<PlanUnitOfWorkInput> {
    return {
      strategyName: strategy.name,
      objective: strategy.objective,
      workType: strategy.workType,
      unitOfWorkName,
      unitOfWorkLimit: strategy.workType === 'one_off' ? strategy.maxAttempts : strategy.versionCount,
      canFinish: strategy.workType === 'one_off' && unitsOfWork.length > 0,
      earlierUnitsOfWork: await this.earlierUnitsOfWork(unitsOfWork.slice(-EARLIER_UNITS_OF_WORK_LIMIT)),
      relatedEvaluations: await this.relatedEvaluations(strategy, unitsOfWork),
    };
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

  /** Scored Jobs from the owner's other Strategies whose objective is close to this one's. */
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

  private async complete(strategy: StrategyEntity, reason: string): Promise<NextUnitOfWork> {
    if (await this.strategies.completeStrategy(strategy.id)) this.logger.log(`Strategy ${strategy.id} complete: ${reason}`);
    return 'complete';
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
