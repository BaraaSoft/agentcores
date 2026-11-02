import type { WorkflowResources } from './workflow-resources';

/** The body of `POST /workflows`: one Strategy on one machine, inside its limits. */
export interface CreateWorkflowRequest {
  readonly strategyId: string;
  readonly machineId: string;
  readonly resources: WorkflowResources;
}
