/**
 * Verdict of a monthly Strategy evaluation against its gold standards.
 */
export const STRATEGY_OUTCOMES = ['success', 'partial', 'failure'] as const;

export type StrategyOutcome = (typeof STRATEGY_OUTCOMES)[number];
