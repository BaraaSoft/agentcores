/**
 * How a Strategy's work repeats. The owner picks it; the planner never changes it.
 * - `continuous`: never-ending work, run as rounds of experiments that each learn from the last.
 * - `one_off`: one deliverable, attempted until the planner says the outcome is met or attempts run out.
 * - `multi_version`: a set number of versions of one deliverable, made one after another.
 */
export const STRATEGY_WORK_TYPES = ['continuous', 'one_off', 'multi_version'] as const;

export type StrategyWorkType = (typeof STRATEGY_WORK_TYPES)[number];
