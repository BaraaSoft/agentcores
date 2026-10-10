import type { WorkflowState } from '@ahe/agent-core';

/**
 * Moves a Workflow to a new lifecycle state.
 */
export interface UpdateWorkflowStateInput {
  readonly workflowId: string;
  readonly state: WorkflowState;
}
