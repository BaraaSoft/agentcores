/** How often the orchestrator looks for Jobs to start. */
export const SCHEDULING_INTERVAL_MS = 60_000;

/** Daily marking of every Job that saw activity (cron, Mac Mini local time). Runs before the report, which reads the marks. */
export const JOB_EVALUATION_CRON = '0 20 * * *';

/** Daily report time (cron, Mac Mini local time). */
export const DAILY_REPORT_CRON = '0 21 * * *';

/** Daily check for whether the active Strategy's 30 days are up. */
export const STRATEGY_CYCLE_CHECK_CRON = '0 3 * * *';
