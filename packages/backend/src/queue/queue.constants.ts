/** Runs one Task through the harness loop. */
export const TASK_EXECUTION_QUEUE = 'task-execution' as const;

/** Daily: measures every active Unit of Work and stores the owner's summary report. */
export const DAILY_REPORT_QUEUE = 'daily-report' as const;

/** End of each 30-day cycle: grades the Strategy and replans. */
export const STRATEGY_EVALUATION_QUEUE = 'strategy-evaluation' as const;
