import type { WorkflowResources } from './workflow-resources';

/** The body of `POST /strategies/:id/run`, which starts a fresh Workflow of the Strategy. */
export interface RunStrategyRequest {
  readonly machineId: string;
  readonly resources: WorkflowResources;
}
