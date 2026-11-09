import type { WorkflowResources } from '@agentcores/agent-core';

/**
 * Data needed to create a Workflow: the Strategy it runs, and the machine it runs on.
 */
export interface CreateWorkflowInput {
  readonly strategyId: string;
  readonly machineId: string;
  readonly resources: WorkflowResources;
}
