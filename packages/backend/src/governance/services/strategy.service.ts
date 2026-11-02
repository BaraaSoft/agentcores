import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyEntity } from '../entities/strategy.entity';
import type { CreateStrategyInput } from '../types/create-strategy-input';

/** Attempts a `one_off` Strategy makes when the owner does not say. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Persistence and lifecycle of Strategies. A Strategy is `active` until its work type's stop rule is
 * met, and then `complete`; the orchestrator decides when.
 */
@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategies: Repository<StrategyEntity>,
  ) {}

  /**
   * Opens a new, active Strategy. A `multi_version` Strategy must say how many versions to make.
   */
  async createStrategy(input: CreateStrategyInput): Promise<StrategyEntity> {
    const isMultiVersion = input.workType === 'multi_version';
    if (isMultiVersion && (input.versionCount === undefined || input.versionCount < 1)) {
      throw new BadRequestException('A multi_version Strategy needs a versionCount of at least 1');
    }
    return this.strategies.save(
      this.strategies.create({
        owner: input.owner,
        name: input.name,
        objective: input.objective,
        workType: input.workType,
        versionCount: isMultiVersion ? input.versionCount : null,
        maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        startDate: input.startDate ?? new Date(),
      }),
    );
  }

  /**
   * Returns the Strategy, or null when it doesn't exist.
   */
  async findStrategyById(strategyId: string): Promise<StrategyEntity | null> {
    return this.strategies.findOneBy({ id: strategyId });
  }

  /**
   * Returns every Strategy, newest first.
   */
  async listStrategies(): Promise<StrategyEntity[]> {
    return this.strategies.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Marks an active Strategy complete and records when. Returns false when it was already complete.
   */
  async completeStrategy(strategyId: string, now = new Date()): Promise<boolean> {
    const update = await this.strategies.update({ id: strategyId, status: 'active' }, { status: 'complete', endDate: now });
    return (update.affected ?? 0) > 0;
  }
}
