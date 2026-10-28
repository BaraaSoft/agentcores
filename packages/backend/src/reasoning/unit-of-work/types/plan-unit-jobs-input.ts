import type { Metric } from '@ahe/agent-core';
import type { JobEvaluation } from '../../evaluation/types/job-evaluation';

/**
 * A Unit of Work that needs Jobs: a new Unit at the start of a Strategy, or one whose Jobs have run out.
 */
export interface PlanUnitJobsInput {
  readonly unitName: string;
  readonly successCriteria: readonly Metric[];
  readonly allocationPercentage: number;
  /** Objectives of the Unit's existing Jobs, so new ones don't repeat them. */
  readonly existingJobObjectives: readonly string[];
  /**
   * How Jobs like these were marked before, worst first: the agent's own record of what went well
   * and badly, so a new Job improves on them instead of repeating them.
   */
  readonly pastEvaluations: readonly JobEvaluation[];
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
}
