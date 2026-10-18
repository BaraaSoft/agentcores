import type { Metric } from '@ahe/agent-core';

/**
 * A Unit of Work that needs Jobs: a new Unit at the start of a Strategy, or one whose Jobs have run out.
 */
export interface PlanUnitJobsInput {
  readonly unitName: string;
  readonly successCriteria: readonly Metric[];
  readonly allocationPercentage: number;
  /** Objectives of the Unit's existing Jobs, so new ones don't repeat them. */
  readonly existingJobObjectives: readonly string[];
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
}
