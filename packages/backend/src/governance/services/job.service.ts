import type { TaskStatus } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { JobEvaluationEntity } from '../entities/job-evaluation.entity';
import { JobEntity } from '../entities/job.entity';
import { TaskEntity } from '../entities/task.entity';
import type { CloseJobInput } from '../types/close-job-input';
import type { CreateJobInput } from '../types/create-job-input';
import type { ListStartableJobsInput } from '../types/list-startable-jobs-input';
import { FINISHED_TASK_STATUSES, REVIEWABLE_TASK_STATUSES } from './task.service';

const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = ['running', 'deferred', 'escalated'];

/**
 * Persistence of Jobs. A Job is open until it is closed with an outcome (success, abandoned, failed).
 * While open, it has no status of its own: its current Task (the lowest-sequence Task not yet
 * finished) decides whether it is ready, running, deferred, or escalated, and a finished Task
 * awaiting review means it needs Job reasoning before it can move on.
 */
@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobs: Repository<JobEntity>,
  ) {}

  /**
   * Creates an open Job under an existing Unit of Work.
   */
  async createJob(input: CreateJobInput): Promise<JobEntity> {
    return this.jobs.save(this.jobs.create({ ...input }));
  }

  /**
   * Returns the Job with its Unit of Work and Strategy loaded, or null. The Unit's state gates the
   * run; the Strategy names the owner.
   */
  async findJobById(jobId: string): Promise<JobEntity | null> {
    return this.jobs.findOne({ where: { id: jobId }, relations: { unitOfWork: { strategy: true } } });
  }

  /**
   * Closes an open Job with its outcome and cancels the Tasks it had not started. Returns false when
   * the Job was already closed, so a duplicate review changes nothing.
   */
  async closeJob(input: CloseJobInput): Promise<boolean> {
    return this.jobs.manager.transaction(async (manager) => {
      const update = await manager
        .getRepository(JobEntity)
        .update(
          { id: input.jobId, outcomeStatus: IsNull() },
          { outcomeStatus: input.status, outcomeSummary: input.summary, closedAt: new Date() },
        );
      if ((update.affected ?? 0) === 0) return false;
      await manager.getRepository(TaskEntity).update({ jobId: input.jobId, status: 'pending' }, { status: 'cancelled' });
      return true;
    });
  }

  /**
   * Counts one more Job reasoning attempt for the Job and returns the new count. Atomic, so
   * concurrent deliveries each get their own number.
   */
  async recordReviewingAttempt(jobId: string): Promise<number> {
    const update = await this.jobs
      .createQueryBuilder()
      .update(JobEntity)
      .set({ reviewingAttempts: () => '"reviewingAttempts" + 1' })
      .where('id = :jobId', { jobId })
      .returning('"reviewingAttempts"')
      .execute();
    const row = (update.raw as { reviewingAttempts: number }[])[0];
    return row?.reviewingAttempts ?? 0;
  }

  /**
   * Resets the attempt count once a plan or review has been applied.
   */
  async resetReviewingAttempts(jobId: string): Promise<void> {
    await this.jobs.update({ id: jobId }, { reviewingAttempts: 0 });
  }

  /**
   * Open Jobs of the Strategy that the Workflow runs that can move now: no Tasks yet (to plan), a
   * finished Task awaiting review, or a `pending` current Task. Only Jobs of a `running` Unit that is
   * `open` or `evaluating` qualify — an evaluating Unit can still hold evidence Jobs — and an ordered Job only
   * once every ordered Job before it in its Unit has succeeded. Oldest Units first, then oldest Jobs.
   */
  async listStartableJobs(input: ListStartableJobsInput): Promise<JobEntity[]> {
    const query = this.openJobs(input.workflowId)
      .andWhere('unit.state = :running', { running: 'running' })
      .andWhere('unit.status IN (:...movable)', { movable: ['open', 'evaluating'] });
    const anyTask = query.subQuery().select('1').from(TaskEntity, 'anyTask').where('anyTask.jobId = job.id').getQuery();
    const unreviewedTask = query
      .subQuery()
      .select('1')
      .from(TaskEntity, 'finished')
      .where('finished.jobId = job.id')
      .andWhere('finished.status IN (:...reviewable)')
      .andWhere('finished.reviewedAt IS NULL')
      .getQuery();
    return query
      .andWhere(new Brackets((inTurn) => inTurn.where('job.orderType = :unordered').orWhere(`NOT EXISTS ${this.earlierStep(query, 'unsettled')}`)))
      .andWhere(
        new Brackets((canMove) =>
          canMove
            .where(`NOT EXISTS ${anyTask}`)
            .orWhere(`EXISTS ${unreviewedTask}`)
            .orWhere(`${this.currentTaskStatus(query)} = :pending`),
        ),
      )
      .setParameters({ reviewable: REVIEWABLE_TASK_STATUSES, pending: 'pending', unordered: 'unordered', success: 'success' })
      .orderBy('unit.sequence', 'ASC')
      .addOrderBy('job.createdAt', 'ASC')
      .limit(input.limit)
      .getMany();
  }

  /**
   * Every Job of these Units, oldest first — the planner's view of what earlier Units tried.
   */
  async listJobsInUnits(unitOfWorkIds: readonly string[]): Promise<JobEntity[]> {
    if (unitOfWorkIds.length === 0) return [];
    return this.jobs.find({ where: { unitOfWorkId: In([...unitOfWorkIds]) }, order: { createdAt: 'ASC', orderNumber: 'ASC' } });
  }

  /**
   * How many Jobs the Unit has, and how many of them are still open.
   */
  async countUnitJobs(unitOfWorkId: string): Promise<{ total: number; open: number }> {
    const [total, open] = await Promise.all([
      this.jobs.countBy({ unitOfWorkId }),
      this.jobs.countBy({ unitOfWorkId, outcomeStatus: IsNull() }),
    ]);
    return { total, open };
  }

  /**
   * Closes as `abandoned` every open ordered Job of the Unit that sits behind an ordered Job which
   * closed without succeeding: those steps can no longer do their part. They never started, because
   * the scheduler held them back. Returns how many were closed.
   */
  async skipStepsAfterFailure(unitOfWorkId: string): Promise<number> {
    const query = this.jobs
      .createQueryBuilder('job')
      .where('job.unitOfWorkId = :unitOfWorkId', { unitOfWorkId })
      .andWhere('job.outcomeStatus IS NULL')
      .andWhere('job.orderType = :ordered', { ordered: 'ordered' });
    const blocked = await query
      .andWhere(`EXISTS ${this.earlierStep(query, 'unsuccessful')}`)
      .setParameter('success', 'success')
      .getMany();
    for (const job of blocked) {
      await this.closeJob({ jobId: job.id, status: 'abandoned', summary: 'Skipped: an earlier step did not succeed.' });
    }
    return blocked.length;
  }

  /**
   * The Unit's closed Jobs that ran at least one Task, with their Unit and Strategy loaded — the Jobs
   * whose evaluation the Unit waits on. Jobs that never started (skipped steps) are left out, and so are
   * Jobs that exist only to gather evidence for an evaluation, so the evaluator never evaluates its own helpers.
   */
  async listJobsToEvaluate(unitOfWorkId: string): Promise<JobEntity[]> {
    const query = this.jobs
      .createQueryBuilder('job')
      .innerJoinAndSelect('job.unitOfWork', 'unit')
      .innerJoinAndSelect('unit.strategy', 'strategy')
      .where('job.unitOfWorkId = :unitOfWorkId', { unitOfWorkId })
      .andWhere('job.outcomeStatus IS NOT NULL');
    const ranTask = query
      .subQuery()
      .select('1')
      .from(TaskEntity, 'task')
      .where('task.jobId = job.id')
      .andWhere('task.status IN (:...reviewable)')
      .getQuery();
    const evidenceFor = query
      .subQuery()
      .select('1')
      .from(JobEvaluationEntity, 'evaluation')
      .where('evaluation.evidenceJobId = job.id')
      .getQuery();
    return query
      .andWhere(`EXISTS ${ranTask}`)
      .andWhere(`NOT EXISTS ${evidenceFor}`)
      .setParameter('reviewable', REVIEWABLE_TASK_STATUSES)
      .orderBy('job.createdAt', 'ASC')
      .getMany();
  }

  /**
   * How many open Jobs of the Strategy that the Workflow runs are active right now: their current Task is running,
   * deferred, or escalated.
   */
  async countActiveJobs(workflowId: string): Promise<number> {
    const query = this.openJobs(workflowId);
    return query
      .andWhere(`${this.currentTaskStatus(query)} IN (:...active)`, { active: ACTIVE_TASK_STATUSES })
      .getCount();
  }

  private openJobs(workflowId: string): SelectQueryBuilder<JobEntity> {
    return this.jobs
      .createQueryBuilder('job')
      .innerJoinAndSelect('job.unitOfWork', 'unit')
      .innerJoin(WorkflowEntity, 'workflow', 'workflow.strategyId = unit.strategyId')
      .where('workflow.id = :workflowId', { workflowId })
      .andWhere('job.outcomeStatus IS NULL');
  }

  /**
   * SQL for an ordered Job before the outer `job` in its Unit that is either not yet a success
   * (`unsettled`: the outer Job must wait) or closed without succeeding (`unsuccessful`: the outer Job
   * can never run). Expects the `success` parameter to be set.
   */
  private earlierStep(query: SelectQueryBuilder<JobEntity>, kind: 'unsettled' | 'unsuccessful'): string {
    const earlier = query
      .subQuery()
      .select('1')
      .from(JobEntity, 'earlier')
      .where('earlier.unitOfWorkId = job.unitOfWorkId')
      .andWhere(`earlier.orderType = 'ordered'`)
      .andWhere('earlier.orderNumber < job.orderNumber');
    return (
      kind === 'unsettled'
        ? earlier.andWhere('(earlier.outcomeStatus IS NULL OR earlier.outcomeStatus <> :success)')
        : earlier.andWhere('earlier.outcomeStatus <> :success')
    ).getQuery();
  }

  /**
   * SQL for the status of the outer `job`'s current Task (its lowest-sequence unfinished Task);
   * NULL when it has none.
   */
  private currentTaskStatus(query: SelectQueryBuilder<JobEntity>): string {
    return query
      .subQuery()
      .select('task.status')
      .from(TaskEntity, 'task')
      .where('task.jobId = job.id')
      .andWhere('task.status NOT IN (:...finished)', { finished: FINISHED_TASK_STATUSES })
      .orderBy('task.sequence', 'ASC')
      .limit(1)
      .getQuery();
  }
}
