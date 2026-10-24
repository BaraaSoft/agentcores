import type { TaskStatus } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { JobEntity } from '../entities/job.entity';
import { TaskEntity } from '../entities/task.entity';
import type { CreateJobInput } from '../types/create-job-input';
import type { ListStartableJobsInput } from '../types/list-startable-jobs-input';
import type { PlaceJobInput } from '../types/place-job-input';
import { UnitOfWorkService } from './unit-of-work.service';

const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = ['running', 'deferred', 'escalated'];

/**
 * Persistence of Jobs. A Job has no status of its own: its current Task (the lowest-sequence Task
 * not yet complete) decides whether it is ready, running, deferred, escalated, failed, or done.
 * A Job is active while its current Task is running, deferred, or escalated.
 */
@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobs: Repository<JobEntity>,
    private readonly units: UnitOfWorkService,
  ) {}

  /**
   * Creates a Job under an existing Unit of Work.
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
   * Returns the Job with its Unit of Work loaded, or null.
   */
  async findJobById(jobId: string): Promise<JobEntity | null> {
    return this.jobs.findOne({ where: { id: jobId }, relations: { unitOfWork: true } });
  }

  /**
   * Jobs of the Workflow's active Strategy, in non-deprecated Units, that are ready: no Tasks yet,
   * or a `pending` current Task. Units with a larger share come first, then older Jobs.
   */
  async listStartableJobs(input: ListStartableJobsInput): Promise<JobEntity[]> {
    const query = this.activeStrategyJobs(input.workflowId).andWhere('unit.isDeprecated = false');
    const anyTask = query.subQuery().select('1').from(TaskEntity, 'anyTask').where('anyTask.jobId = job.id').getQuery();
    return query
      .andWhere(
        new Brackets((ready) =>
          ready.where(`NOT EXISTS ${anyTask}`).orWhere(`${this.currentTaskStatus(query)} = :pending`, { pending: 'pending' }),
        ),
      )
      .orderBy('unit.allocationPercentage', 'DESC')
      .addOrderBy('job.createdAt', 'ASC')
      .limit(input.limit)
      .getMany();
  }

  /**
   * How many of the Workflow's Jobs are active right now: their current Task is running,
   * deferred, or escalated.
   */
  async countActiveJobs(workflowId: string): Promise<number> {
    const query = this.activeStrategyJobs(workflowId);
    return query
      .andWhere(`${this.currentTaskStatus(query)} IN (:...active)`, { active: ACTIVE_TASK_STATUSES })
      .getCount();
  }

  private activeStrategyJobs(workflowId: string): SelectQueryBuilder<JobEntity> {
    return this.jobs
      .createQueryBuilder('job')
      .innerJoinAndSelect('job.unitOfWork', 'unit')
      .innerJoin(WorkflowEntity, 'workflow', 'workflow.activeStrategyId = unit.strategyId')
      .where('workflow.id = :workflowId', { workflowId });
  }

  /**
   * SQL for the status of the outer `job`'s current Task; NULL when it has none left.
   */
  private currentTaskStatus(query: SelectQueryBuilder<JobEntity>): string {
    return query
      .subQuery()
      .select('task.status')
      .from(TaskEntity, 'task')
      .where('task.jobId = job.id')
      .andWhere(`task.status <> 'complete'`)
      .orderBy('task.sequence', 'ASC')
      .limit(1)
      .getQuery();
  }
}
