import type { WorkflowState } from '@agentcores/agent-core';

/**
 * Moves a Workflow to a new lifecycle state.
 */
export interface UpdateWorkflowStateInput {
  readonly workflowId: string;
  readonly state: WorkflowState;
}
