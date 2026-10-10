import type { StrategyEvaluation } from '@ahe/agent-core';

/**
 * Stores the grade of a finished Strategy.
 */
export interface RecordEvaluationInput {
  readonly strategyId: string;
  readonly evaluation: StrategyEvaluation;
}
