/** The three calls that launch a strategy, in order: create the Strategy, create its Workflow, start it. */
export type LaunchStepId = 'strategy' | 'workflow' | 'start';

/** The launch steps in the order they run. */
export const LAUNCH_STEP_IDS: readonly LaunchStepId[] = ['strategy', 'workflow', 'start'];
