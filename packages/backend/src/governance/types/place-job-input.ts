import type { PlannedJob } from '../../reasoning/unit-of-work/types/planned-job';

/**
 * A proposed Job to file under the right Unit of Work in a Strategy.
 */
export interface PlaceJobInput {
  readonly strategyId: string;
  readonly plannedJob: PlannedJob;
}
