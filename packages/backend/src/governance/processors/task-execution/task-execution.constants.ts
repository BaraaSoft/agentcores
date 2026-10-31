/** Max plan → execute rounds for one Task before it is failed. */
export const MAX_TASK_ITERATIONS = 12;

/** The latest earlier Tasks of the Job that go into the execution context; Task reasoning sees them all. */
export const EARLIER_TASKS_IN_EXECUTION_CONTEXT = 10;

/** Max memory records loaded into a Task's context. */
export const TASK_CONTEXT_RECORD_LIMIT = 8;

/** How far back gates are counted when telling Task reasoning how hard an account has been challenged. */
export const CHALLENGE_WINDOW_MS = 24 * 60 * 60 * 1000;
