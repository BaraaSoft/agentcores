import type { Metric, UnitMeasurement } from '@ahe/agent-core';
import type { JobEvaluation } from '../../job/types/job-evaluation';

/**
 * Everything needed to review one Unit of Work at the end of a cycle. The Unit level reads
 * its measured metrics and one evaluation per Job, never individual Tasks.
 */
export interface ReviewUnitInput {
  readonly unitOfWorkId: string;
  readonly unitName: string;
  readonly successCriteria: readonly Metric[];
  readonly allocationPercentage: number;
  readonly measurement: UnitMeasurement;
  readonly jobEvaluations: readonly JobEvaluation[];
}
