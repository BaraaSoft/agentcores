/**
 * Where a Strategy is in its life.
 * - `active`: the orchestrator keeps opening Units for it.
 * - `complete`: its work type's stop rule was met; nothing more is planned.
 */
export const STRATEGY_STATUSES = ['active', 'complete'] as const;

export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];
