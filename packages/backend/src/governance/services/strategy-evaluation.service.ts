import { Injectable, NotImplementedException } from '@nestjs/common';
import { JobReasoningService } from '../../reasoning/job/job-reasoning.service';
import { StrategyReasoningService } from '../../reasoning/strategy/strategy-reasoning.service';
import { UnitReasoningService } from '../../reasoning/unit-of-work/unit-reasoning.service';
import type { StrategyReview } from '../../reasoning/strategy/types/strategy-review';
import { WorkflowService } from '../../workflow/workflow.service';
import type { ApplyReviewInput } from '../types/apply-review-input';
import { JobService } from './job.service';
import { MetricsService } from './metrics.service';
import { StrategyService } from './strategy.service';
import { UnitOfWorkService } from './unit-of-work.service';

/**
 * The monthly review. Results roll up the hierarchy one level at a time — each Job is evaluated,
 * each Unit reviewed from its Job evaluations, and the Strategy graded from the Unit reviews —
 * then the verdict is acted on: shift effort, deprecate weak Units, add Jobs. The orchestrator plans
 * the next Strategy once the Workflow is back to `running`.
 */
@Injectable()
export class StrategyEvaluationService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly strategyReasoning: StrategyReasoningService,
    private readonly unitReasoning: UnitReasoningService,
    private readonly jobReasoning: JobReasoningService,
    private readonly strategies: StrategyService,
    private readonly units: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Moves the Workflow to `evaluating`, measures the cycle, and rolls the results up:
   * `evaluateJob` per Job, `reviewUnit` per Unit, then `reviewStrategy`.
   */
  async evaluateActiveStrategy(workflowId: string): Promise<StrategyReview> {
    throw new NotImplementedException();
  }

  /**
   * Records the grade, applies reallocations / deprecations / new Jobs (filed through
   * `JobService.placeJob`), and returns the Workflow to `running`.
   */
  async applyReview(input: ApplyReviewInput): Promise<void> {
    throw new NotImplementedException();
  }
}
