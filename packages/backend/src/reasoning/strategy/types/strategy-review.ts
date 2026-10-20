import type { StrategyEvaluation } from '@ahe/agent-core';
import type { PlannedJob } from '../../unit-of-work/types/planned-job';
import type { UnitReallocation } from './unit-reallocation';

/**
 * The outcome of a monthly review: the grade, plus the changes to make —
 * shift effort, drop weak Units, or try new Jobs. A new Job that fits no existing Unit
 * may form a new one (see JobService.placeJob).
 */
export interface StrategyReview {
  readonly evaluation: StrategyEvaluation;
  readonly reallocations: readonly UnitReallocation[];
  readonly unitIdsToDeprecate: readonly string[];
  readonly newJobs: readonly PlannedJob[];
}
