import type { GoldStandards, StrategyEvaluation } from '@ahe/agent-core';

/**
 * What the reasoning layer needs to plan a new Strategy.
 */
export interface PlanStrategyInput {
  readonly workflowName: string;
  readonly goldStandards: GoldStandards;
  /** Owner context from the safe memory zone, already rendered as text. */
  readonly safeContext: string;
  /** Evaluations of earlier Strategies, newest first, so it can learn from them. */
  readonly previousEvaluations: readonly StrategyEvaluation[];
}
