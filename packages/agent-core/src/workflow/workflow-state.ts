/**
 * Lifecycle states of a Workflow. A Workflow is one run of a Strategy.
 * - `running`: the orchestrator moves the run forward and starts its Jobs.
 * - `paused`: nothing is scheduled, and its Units of Work are paused; the owner can resume it.
 * - `done`: the work type's stop rule was met. It is final: to run the Strategy again, start a new Workflow.
 *   Only `one_off` and `multi_version` runs reach it; a `continuous` run only runs or pauses.
 */
export const WORKFLOW_STATES = ['running', 'paused', 'done'] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];
