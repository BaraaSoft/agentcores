import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyEntity } from '../entities/strategy.entity';
import type { CreateStrategyInput } from '../types/create-strategy-input';

/** Attempts a `one_off` Strategy makes when the owner does not say. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Persistence of Strategies. A Strategy is a reusable goal with no lifecycle of its own: each run of
 * it is a Workflow, and the Workflow is what ends `done`.
 */
@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategies: Repository<StrategyEntity>,
  ) {}

  /**
   * Saves a new Strategy. A `multi_version` Strategy must say how many versions to make.
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
}
