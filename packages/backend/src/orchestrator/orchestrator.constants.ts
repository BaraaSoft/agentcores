import type { StrategyWorkType } from '@ahe/agent-core';

/** How often the orchestrator runs its scheduling pass. */
export const SCHEDULING_INTERVAL_MS = 60_000;

/** How long a `continuous` Unit waits after its last Job closes before it is evaluated, so engagement can arrive. */
export const CONTINUOUS_EVALUATION_DELAY_MS = 24 * 60 * 60 * 1000;

/** Earlier Units of Work of the Strategy the planner reads, most recent ones. */
export const EARLIER_UNITS_OF_WORK_LIMIT = 5;

/** Evaluations of similar Jobs from the owner's other Strategies the planner reads. */
export const RELATED_EVALUATIONS_LIMIT = 5;

/** What each Unit of Work is called, by work type: "Round 3", "Attempt 2", "Version 1". */
export const UNIT_OF_WORK_NAME_PREFIXES: Record<StrategyWorkType, string> = {
  continuous: 'Round',
  one_off: 'Attempt',
  multi_version: 'Version',
};

/** Daily report time (cron, Mac Mini local time). Not registered yet. */
export const DAILY_REPORT_CRON = '0 21 * * *';
