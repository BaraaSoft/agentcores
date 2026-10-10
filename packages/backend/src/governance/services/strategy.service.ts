import type { StrategyEvaluation } from '@ahe/agent-core';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyEntity } from '../entities/strategy.entity';
import type { CreateStrategyInput } from '../types/create-strategy-input';
import type { RecordEvaluationInput } from '../types/record-evaluation-input';

const DEFAULT_HISTORY_LIMIT = 3;

/**
 * Persistence and lifecycle of Strategies (30-day cycles).
 */
@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategies: Repository<StrategyEntity>,
  ) {}

  /**
   * Opens a new Strategy that ends 30 days after its start date.
   */
  async createStrategy(input: CreateStrategyInput): Promise<StrategyEntity> {
    throw new NotImplementedException();
  }

  /**
   * Loads a Strategy with its full tree (Units → Jobs → Tasks).
   */
  async findStrategyTree(strategyId: string): Promise<StrategyEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * Returns evaluations of the Workflow's past Strategies, newest first.
   */
  async listPastEvaluations(workflowId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<StrategyEvaluation[]> {
    throw new NotImplementedException();
  }

  /**
   * Stores the grade of a finished Strategy.
   */
  async recordEvaluation(input: RecordEvaluationInput): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * True once the Strategy's 30-day window has ended.
   */
  isCycleComplete(strategy: StrategyEntity, now = new Date()): boolean {
    throw new NotImplementedException();
  }
}
