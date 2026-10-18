import type { StrategyReview } from '../../reasoning/strategy/types/strategy-review';

/**
 * A Strategy review whose decisions should now be carried out.
 */
export interface ApplyReviewInput {
  readonly workflowId: string;
  readonly strategyId: string;
  readonly review: StrategyReview;
}
