import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UnitReallocation } from '../../reasoning/strategy/types/unit-reallocation';
import { UnitOfWorkEntity } from '../entities/unit-of-work.entity';
import type { CreateUnitOfWorkInput } from '../types/create-unit-of-work-input';
import type { FindMatchingUnitInput } from '../types/find-matching-unit-input';

/**
 * Persistence of Units of Work, plus the allocation rules: active Units in a Strategy
 * always sum to 100%, and deprecated Units receive no new Jobs.
 */
@Injectable()
export class UnitOfWorkService {
  constructor(
    @InjectRepository(UnitOfWorkEntity)
    private readonly units: Repository<UnitOfWorkEntity>,
  ) {}

  /**
   * Creates a Unit. Callers should first try `findMatchingUnit` — new Units are a last resort.
   */
  async createUnitOfWork(input: CreateUnitOfWorkInput): Promise<UnitOfWorkEntity> {
    return this.units.save(
      this.units.create({
        strategyId: input.strategyId,
        name: input.name,
        successCriteria: [...input.successCriteria],
        allocationPercentage: input.allocationPercentage,
      }),
    );
  }

  /**
   * Finds the active Unit a Job belongs to, or null when none fits. Matches on the Unit name
   * within the Strategy, ignoring case and surrounding spaces; `jobObjective` is not used yet.
   */
  async findMatchingUnit(input: FindMatchingUnitInput): Promise<UnitOfWorkEntity | null> {
    return this.units
      .createQueryBuilder('unit')
      .where('unit.strategyId = :strategyId', { strategyId: input.strategyId })
      .andWhere('unit.isDeprecated = false')
      .andWhere('LOWER(TRIM(unit.name)) = LOWER(TRIM(:name))', { name: input.unitName })
      .orderBy('unit.createdAt', 'ASC')
      .getOne();
  }

  /**
   * Lists the non-deprecated Units of a Strategy.
   */
  async listActiveUnits(strategyId: string): Promise<UnitOfWorkEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * Applies new effort shares and rescales the rest so the total stays 100%.
   */
  async reallocateUnits(reallocations: readonly UnitReallocation[]): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * Retires underperforming Units; their allocation is redistributed to the others.
   */
  async deprecateUnits(unitIds: readonly string[]): Promise<void> {
    throw new NotImplementedException();
  }
}
