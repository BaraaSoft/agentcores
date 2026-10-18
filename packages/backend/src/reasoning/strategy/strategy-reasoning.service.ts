import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import type { PlanStrategyInput } from './types/plan-strategy-input';
import type { ReviewStrategyInput } from './types/review-strategy-input';
import type { StrategyPlan } from './types/strategy-plan';
import type { StrategyReview } from './types/strategy-review';

/**
 * Strategy-level reasoning: the 30-day cycle. Decides which Units of Work to run and how to
 * split effort between them, then grades the cycle against the gold standards.
 * It reads Unit reviews only — never Jobs, Tasks, or steps.
 */
@Injectable()
export class StrategyReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Proposes the Units of Work and their effort shares for a new Strategy, learning from past evaluations.
   */
  async planStrategy(input: PlanStrategyInput): Promise<StrategyPlan> {
    throw new NotImplementedException();
  }

  /**
   * Grades a finished Strategy from its Unit reviews and proposes reallocations, deprecations, and new Jobs.
   */
  async reviewStrategy(input: ReviewStrategyInput): Promise<StrategyReview> {
    throw new NotImplementedException();
  }
}
