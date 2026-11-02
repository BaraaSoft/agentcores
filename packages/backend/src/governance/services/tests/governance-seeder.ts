import type { JobOutcomeStatus, StrategyWorkType, TaskStatus, WorkflowResources } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WorkflowEntity } from '../../../workflow/entities/workflow.entity';
import { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEntity } from '../../entities/job.entity';
import { MetricSnapshotEntity } from '../../entities/metric-snapshot.entity';
import { StrategyEntity } from '../../entities/strategy.entity';
import { TaskEntity } from '../../entities/task.entity';
import { UnitOfWorkEntity } from '../../entities/unit-of-work.entity';

/** Every entity the governance services touch, including the Workflow that runs the Strategy. */
export const GOVERNANCE_ENTITIES = [
  WorkflowEntity,
  StrategyEntity,
  UnitOfWorkEntity,
  JobEntity,
  TaskEntity,
  MetricSnapshotEntity,
  JobEvaluationEntity,
];

/**
 * Seeds and clears governance rows for integration specs: a Strategy and a running Workflow (one run
 * of it) are created first, then Units, Jobs, and Tasks under that run.
 */
@Injectable()
export class GovernanceSeeder {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Empties every table, so each test starts from nothing.
   */
  async clear(): Promise<void> {
    const tables = this.dataSource.entityMetadatas.map((metadata) => `"${metadata.schema}"."${metadata.tableName}"`).join(', ');
    await this.dataSource.query(`TRUNCATE ${tables} CASCADE`);
  }

  /**
   * A Strategy for `owner`, and one running Workflow that runs it on a machine.
   */
  async strategyWithWorkflow(
    owner = 'owner-1',
    workType: StrategyWorkType = 'continuous',
  ): Promise<{ workflow: WorkflowEntity; strategy: StrategyEntity }> {
    const strategy = await this.strategy(owner, workType);
    return { workflow: await this.workflow(strategy.id), strategy };
  }

  async strategy(owner = 'owner-1', workType: StrategyWorkType = 'continuous'): Promise<StrategyEntity> {
    return this.dataSource.getRepository(StrategyEntity).save({
      owner,
      name: 'October',
      objective: 'Get the first 100 people to try AHE',
      workType,
      versionCount: workType === 'multi_version' ? 3 : null,
      startDate: new Date('2026-10-01T00:00:00Z'),
    });
  }

  /**
   * Adds the run's next Unit, numbered after the ones it already has. The run is `changes.workflowId`,
   * or else the Strategy's first Workflow, made running on a machine when it has none.
   */
  async unit(strategyId: string, name: string, changes: Partial<UnitOfWorkEntity> = {}): Promise<UnitOfWorkEntity> {
    const units = this.dataSource.getRepository(UnitOfWorkEntity);
    const workflowId = changes.workflowId ?? (await this.firstWorkflow(strategyId)).id;
    const sequence = (await units.countBy({ workflowId })) + 1;
    return units.save({ strategyId, workflowId, name, sequence, ...changes });
  }

  /**
   * A new running Workflow — one more run — of the Strategy.
   */
  async workflow(strategyId: string, state: WorkflowEntity['state'] = 'running'): Promise<WorkflowEntity> {
    return this.dataSource
      .getRepository(WorkflowEntity)
      .save({ strategyId, machineId: 'machine-1', resources: {} as WorkflowResources, state });
  }

  private async firstWorkflow(strategyId: string): Promise<WorkflowEntity> {
    const existing = await this.dataSource.getRepository(WorkflowEntity).findOne({ where: { strategyId }, order: { createdAt: 'ASC' } });
    return existing ?? this.workflow(strategyId);
  }

  /**
   * Adds a Job to a Unit. Giving an `orderNumber` makes it an ordered Job.
   */
  async job(
    unitOfWorkId: string,
    name = 'Engage r/AICompanion',
    outcomeStatus: JobOutcomeStatus | null = null,
    orderNumber: number | null = null,
  ): Promise<JobEntity> {
    return this.dataSource.getRepository(JobEntity).save({
      unitOfWorkId,
      name,
      objective: `Objective of ${name}`,
      orderType: orderNumber === null ? 'unordered' : 'ordered',
      orderNumber,
      outcomeStatus,
      outcomeSummary: outcomeStatus === null ? null : `Closed as ${outcomeStatus}`,
      closedAt: outcomeStatus === null ? null : new Date(),
    });
  }

  /**
   * Adds Tasks to a Job with the given statuses, in sequence order. Complete and failed Tasks are
   * already reviewed unless `isAwaitingReview`, which leaves the last of them unreviewed.
   */
  async tasks(workflowId: string, jobId: string, statuses: readonly TaskStatus[], isAwaitingReview = false): Promise<TaskEntity[]> {
    const reviewable = statuses.map((status) => status === 'complete' || status === 'failed');
    const awaitingReview = isAwaitingReview ? reviewable.lastIndexOf(true) : -1;
    return this.dataSource.getRepository(TaskEntity).save(
      statuses.map((status, index) => ({
        workflowId,
        jobId,
        action: `Action ${index + 1}`,
        sequence: index + 1,
        status,
        result: null,
        failureReason: null,
        startedAt: null,
        completedAt: null,
        reviewedAt: reviewable[index] && index !== awaitingReview ? new Date() : null,
      })),
    );
  }
}
