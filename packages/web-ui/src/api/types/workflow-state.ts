/**
 * Where one run of a Strategy is. `done` is final, and only one_off and multi_version runs reach it. A
 * continuous run only runs or pauses.
 */
export type WorkflowState = 'running' | 'paused' | 'done';
