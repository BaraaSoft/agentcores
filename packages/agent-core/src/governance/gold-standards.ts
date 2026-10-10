import type { Metric } from './metric';

/**
 * The ultimate goals a Strategy is graded against at the end of its cycle.
 * Everything below a Strategy rolls up into these numbers.
 */
export interface GoldStandards {
  readonly metrics: readonly Metric[];
  readonly evaluationPeriod: '30d';
}
