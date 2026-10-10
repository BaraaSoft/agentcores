/**
 * Lifecycle states of a Workflow.
 * - `running`: the orchestrator is scheduling its Tasks.
 * - `paused`: nothing is scheduled; state is kept as-is.
 * - `evaluating`: the 30-day Strategy is being graded and replanned.
 */
export const WORKFLOW_STATES = ['running', 'paused', 'evaluating'] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];
