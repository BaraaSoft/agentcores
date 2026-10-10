import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningService } from '../../reasoning/reasoning.service';
import type { StrategyReview } from '../../reasoning/types/strategy-review';
import { WorkflowService } from '../../workflow/workflow.service';
import type { ApplyReviewInput } from '../types/apply-review-input';
import { MetricsService } from './metrics.service';
import { PlanningService } from './planning.service';
import { StrategyService } from './strategy.service';
import { UnitOfWorkService } from './unit-of-work.service';

/**
 * The monthly review. Grades the active Strategy against its gold standards,
 * then acts on the verdict: shift effort, deprecate weak Units, add Jobs, and start the next cycle.
 */
@Injectable()
export class StrategyEvaluationService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly reasoning: ReasoningService,
    private readonly strategies: StrategyService,
    private readonly units: UnitOfWorkService,
    private readonly metrics: MetricsService,
    private readonly planning: PlanningService,
  ) {}

  /**
   * Moves the Workflow to `evaluating`, measures the cycle, and asks the reasoning layer for a review.
   */
  async evaluateActiveStrategy(workflowId: string): Promise<StrategyReview> {
    throw new NotImplementedException();
  }

  /**
   * Records the grade, applies reallocations / deprecations / new Jobs,
   * opens the next Strategy, and returns the Workflow to `running`.
   */
  async applyReview(input: ApplyReviewInput): Promise<void> {
    throw new NotImplementedException();
  }
}
