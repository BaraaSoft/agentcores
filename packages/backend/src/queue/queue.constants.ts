/** Breaks a Job into Tasks (once) and queues its next pending Task. */
export const JOB_EXECUTION_QUEUE = 'job-execution' as const;

/** Runs one Task: Task reasoning against the execution layer, step by step. */
export const TASK_EXECUTION_QUEUE = 'task-execution' as const;

/** Daily: marks every Job that saw activity, and judges one Job once its evidence is in. */
export const JOB_EVALUATION_QUEUE = 'job-evaluation' as const;

/** Daily: measures every active Unit of Work and stores the owner's summary report. */
export const DAILY_REPORT_QUEUE = 'daily-report' as const;

/** End of each 30-day cycle: grades the Strategy and replans. */
export const STRATEGY_EVALUATION_QUEUE = 'strategy-evaluation' as const;
