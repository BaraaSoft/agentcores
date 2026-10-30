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
   * Every Unit of the Strategy, oldest first.
   */
  async listUnitsOfWork(strategyId: string): Promise<UnitOfWorkEntity[]> {
    return this.unitsOfWork.find({ where: { strategyId }, order: { sequence: 'ASC' } });
  }

  /**
   * The Strategy's `evaluating` Units whose `evaluateAfter` has passed, oldest first.
   */
  async listUnitsOfWorkDueForEvaluation(strategyId: string, now = new Date()): Promise<UnitOfWorkEntity[]> {
    return this.unitsOfWork.find({
      where: { strategyId, status: 'evaluating', evaluateAfter: LessThanOrEqual(now) },
      order: { sequence: 'ASC' },
    });
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
