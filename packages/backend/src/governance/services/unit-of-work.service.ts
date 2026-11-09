import type { UnitOfWorkState } from '@agentcores/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { JobEntity } from '../entities/job.entity';
import { UnitOfWorkEntity } from '../entities/unit-of-work.entity';
import type { CreateUnitOfWorkInput } from '../types/create-unit-of-work-input';

/**
 * Persistence of Units of Work. A Unit only groups Jobs: the orchestrator opens one with its planned
 * Jobs, and moves it `open → evaluating → complete`. Each move is conditional on the status it expects,
 * so a scheduling pass can run twice without moving a Unit twice.
 */
@Injectable()
export class UnitOfWorkService {
  constructor(
    @InjectRepository(UnitOfWorkEntity)
    private readonly unitsOfWork: Repository<UnitOfWorkEntity>,
  ) {}

  /**
   * Opens a Unit with its Jobs in one transaction, so a crash never leaves an open Unit with no Jobs.
   * Ordered Jobs are numbered 1, 2, 3, … in the order given. A second Unit with the same `sequence`
   * fails on the unique index, which is what stops two passes opening the same Unit.
   */
  async createUnitOfWork(input: CreateUnitOfWorkInput): Promise<UnitOfWorkEntity> {
    return this.unitsOfWork.manager.transaction(async (manager) => {
      const unitOfWork = await manager
        .getRepository(UnitOfWorkEntity)
        .save({
          strategyId: input.strategyId,
          workflowId: input.workflowId,
          sequence: input.sequence,
          name: input.name,
          title: input.title,
          rationale: input.rationale,
        });
      let orderNumber = 0;
      await manager.getRepository(JobEntity).save(
        input.jobs.map((job) => ({
          unitOfWorkId: unitOfWork.id,
          name: job.name,
          objective: job.objective,
          orderType: job.orderType,
          orderNumber: job.orderType === 'ordered' ? ++orderNumber : null,
        })),
      );
      return unitOfWork;
    });
  }

  /**
   * Every Unit of the run, oldest first.
   */
  async listUnitsOfWork(workflowId: string): Promise<UnitOfWorkEntity[]> {
    return this.unitsOfWork.find({ where: { workflowId }, order: { sequence: 'ASC' } });
  }

  /**
   * The Units of the Strategy's other runs, oldest run first, then by sequence. A new run plans with them.
   */
  async listEarlierRunUnitsOfWork(strategyId: string, workflowId: string): Promise<UnitOfWorkEntity[]> {
    return this.unitsOfWork
      .createQueryBuilder('unit')
      .innerJoin('unit.workflow', 'workflow')
      .where('unit.strategyId = :strategyId', { strategyId })
      .andWhere('unit.workflowId != :workflowId', { workflowId })
      .orderBy('workflow.createdAt', 'ASC')
      .addOrderBy('unit.sequence', 'ASC')
      .getMany();
  }

  /**
   * The run's `evaluating` Units whose `evaluateAfter` has passed, oldest first.
   */
  async listUnitsOfWorkDueForEvaluation(workflowId: string, now = new Date()): Promise<UnitOfWorkEntity[]> {
    return this.unitsOfWork.find({
      where: { workflowId, status: 'evaluating', evaluateAfter: LessThanOrEqual(now) },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * Pauses or resumes every Unit of the run. The queue processors check this state, so a paused run's
   * queued Jobs and Tasks stop before they begin, and a running Task stops before its next step.
   */
  async setRunState(workflowId: string, state: UnitOfWorkState): Promise<void> {
    await this.unitsOfWork.update({ workflowId }, { state });
  }

  /**
   * Moves an open Unit to `evaluating`, to be evaluated once `evaluateAfter` has passed. Returns false
   * when it was not open.
   */
  async markEvaluating(unitOfWorkId: string, evaluateAfter: Date): Promise<boolean> {
    const update = await this.unitsOfWork.update({ id: unitOfWorkId, status: 'open' }, { status: 'evaluating', evaluateAfter });
    return (update.affected ?? 0) > 0;
  }

  /**
   * Moves an evaluated Unit to `complete`. Returns false when it was not `evaluating`.
   */
  async markComplete(unitOfWorkId: string): Promise<boolean> {
    const update = await this.unitsOfWork.update({ id: unitOfWorkId, status: 'evaluating' }, { status: 'complete' });
    return (update.affected ?? 0) > 0;
  }
}
