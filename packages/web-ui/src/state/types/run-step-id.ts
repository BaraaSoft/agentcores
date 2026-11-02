/** The steps that run a Strategy again: pause the work on the machine, start the fresh run, wait until the machine is free. */
export type RunStepId = 'pause' | 'start' | 'free';

/** The run steps in the order they happen. */
export const RUN_STEP_IDS: readonly RunStepId[] = ['pause', 'start', 'free'];
