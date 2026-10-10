import type { StrategyOutcome } from './strategy-outcome';

/**
 * The recorded result of grading a Strategy. Kept on the Strategy so future
 * cycles can learn from what worked and what didn't.
 */
export interface StrategyEvaluation {
  readonly outcome: StrategyOutcome;
  /** Plain-language account of what worked and what didn't. */
  readonly summary: string;
  /** Actual value reached per gold-standard metric key. */
  readonly metricsAchieved: Readonly<Record<string, number>>;
}
