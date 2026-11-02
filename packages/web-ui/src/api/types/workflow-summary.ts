import type { WorkflowResources } from './workflow-resources';

/** One Workflow, as `GET /workflows` lists it. */
export interface WorkflowSummary {
  readonly id: string;
  readonly strategyId: string;
  readonly machineId: string;
  readonly state: 'running' | 'paused';
  readonly resources: WorkflowResources;
  /** ISO time the Workflow was created. */
  readonly createdAt: string;
  /** ISO time of the last change, such as a start or a pause. */
  readonly updatedAt: string;
}
