import type { PlannedJob } from './planned-job';
import type { UnitRecommendation } from './unit-recommendation';

/**
 * One Unit of Work's verdict for the cycle: the compressed view the Strategy review reads.
 */
export interface UnitReview {
  readonly unitOfWorkId: string;
  readonly unitName: string;
  readonly isMeetingCriteria: boolean;
  /** A few sentences: what moved the metrics, what didn't, and why. */
  readonly summary: string;
  readonly recommendation: UnitRecommendation;
  /** Jobs worth trying next inside this Unit. */
  readonly proposedJobs: readonly PlannedJob[];
}
