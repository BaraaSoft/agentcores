/** How often the orchestrator looks for Tasks to schedule. */
export const SCHEDULING_INTERVAL_MS = 60_000;

/** Daily report time (cron, Mac Mini local time). */
export const DAILY_REPORT_CRON = '0 21 * * *';

/** Daily check for whether the active Strategy's 30 days are up. */
export const STRATEGY_CYCLE_CHECK_CRON = '0 3 * * *';
