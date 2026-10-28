import type { TaskStatus } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { JobEvaluationEntity } from '../entities/job-evaluation.entity';
import { JobEntity } from '../entities/job.entity';
import { TaskEntity } from '../entities/task.entity';
import type { CloseJobInput } from '../types/close-job-input';
import type { CreateJobInput } from '../types/create-job-input';
import type { ListJobsWithActivityInput } from '../types/list-jobs-with-activity-input';
import type { ListStartableJobsInput } from '../types/list-startable-jobs-input';
import type { PlaceJobInput } from '../types/place-job-input';
import { FINISHED_TASK_STATUSES, REVIEWABLE_TASK_STATUSES } from './task.service';
import { UnitOfWorkService } from './unit-of-work.service';

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
    private readonly units: UnitOfWorkService,
  ) {}

  /**
   * Creates an open Job under an existing Unit of Work.
   */
  async createJob(input: CreateJobInput): Promise<JobEntity> {
    return this.jobs.save(this.jobs.create({ ...input }));
  }

  /**
   * Files a proposed Job under the matching Unit (`findMatchingUnit`), or creates a new Unit
   * only when none fits. A new Unit starts with no success criteria and a 0% share, so the
   * Strategy's shares still sum to 100%; the next review gives it a share.
   */
  async placeJob(input: PlaceJobInput): Promise<JobEntity> {
    const { strategyId, plannedJob } = input;
    const unit =
      (await this.units.findMatchingUnit({ strategyId, unitName: plannedJob.unitName, jobObjective: plannedJob.objective })) ??
      (await this.units.createUnitOfWork({ strategyId, name: plannedJob.unitName, successCriteria: [], allocationPercentage: 0 }));
    return this.createJob({ unitOfWorkId: unit.id, name: plannedJob.name, objective: plannedJob.objective });
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
   * Open Jobs of the Strategy that the Workflow runs, in non-deprecated Units, that can move: no Tasks
   * yet (to plan), a finished Task awaiting review, or a `pending` current Task. Units with a larger
   * share come first, then older Jobs.
   */
  async listStartableJobs(input: ListStartableJobsInput): Promise<JobEntity[]> {
    const query = this.openJobs(input.workflowId).andWhere('unit.isDeprecated = false');
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
      .andWhere(
        new Brackets((canMove) =>
          canMove
            .where(`NOT EXISTS ${anyTask}`)
            .orWhere(`EXISTS ${unreviewedTask}`)
            .orWhere(`${this.currentTaskStatus(query)} = :pending`),
        ),
      )
      .setParameters({ reviewable: REVIEWABLE_TASK_STATUSES, pending: 'pending' })
      .orderBy('unit.allocationPercentage', 'DESC')
      .addOrderBy('job.createdAt', 'ASC')
      .limit(input.limit)
      .getMany();
  }

  /**
   * Jobs of the Strategy that the Workflow runs that did something on `evaluationDate`: a Task of theirs
   * was reviewed that day, or the Job itself closed that day. Open and closed Jobs both count,
   * because engagement on finished work keeps arriving for days afterwards. Jobs that exist only to
   * gather evidence for an evaluation are left out, so the evaluator never judges its own helpers.
   *
   * The day boundary is the database's time zone, which is the same machine the daily cron runs on.
   */
  async listJobsWithActivityOn(input: ListJobsWithActivityInput): Promise<JobEntity[]> {
    const query = this.jobs
      .createQueryBuilder('job')
      .innerJoinAndSelect('job.unitOfWork', 'unit')
      .innerJoinAndSelect('unit.strategy', 'strategy')
      .innerJoin(WorkflowEntity, 'workflow', 'workflow.strategyId = unit.strategyId')
      .where('workflow.id = :workflowId');
    const reviewedTask = query
      .subQuery()
      .select('1')
      .from(TaskEntity, 'task')
      .where('task.jobId = job.id')
      .andWhere('"task"."reviewedAt"::date = :evaluationDate')
      .getQuery();
    const evidenceFor = query
      .subQuery()
      .select('1')
      .from(JobEvaluationEntity, 'evaluation')
      .where('evaluation.evidenceJobId = job.id')
      .getQuery();
    return query
      .andWhere(
        new Brackets((hasActivity) =>
          hasActivity.where(`EXISTS ${reviewedTask}`).orWhere('"job"."closedAt"::date = :evaluationDate'),
        ),
      )
      .andWhere(`NOT EXISTS ${evidenceFor}`)
      .setParameters({ workflowId: input.workflowId, evaluationDate: input.evaluationDate })
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
