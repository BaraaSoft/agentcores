import type { GoldStandards } from '@ahe/agent-core';
import type { UnitReview } from '../../unit-of-work/types/unit-review';

/**
 * Everything needed to grade a Strategy at the end of its cycle. The Strategy level reads
 * one review per Unit of Work, never individual Jobs or Tasks.
 */
export interface ReviewStrategyInput {
  readonly strategyName: string;
  readonly goldStandards: GoldStandards;
  readonly goldStandardValues: Readonly<Record<string, number>>;
  readonly unitReviews: readonly UnitReview[];
}
