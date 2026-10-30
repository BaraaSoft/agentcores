/**
 * Lifecycle states of a Workflow.
 * - `running`: the orchestrator moves its Strategy forward and starts its Jobs.
 * - `paused`: nothing is scheduled; state is kept as-is.
 */
export const WORKFLOW_STATES = ['running', 'paused'] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];
