import type { WorkflowResources } from '@ahe/agent-core';

/**
 * Data needed to create a Workflow.
 */
export interface CreateWorkflowInput {
  readonly name: string;
  readonly owner: string;
  readonly resources: WorkflowResources;
}
