import type { WorkflowResources } from '../../api/types/workflow-resources';

/** What the owner chose for a new Workflow of an existing Strategy. */
export interface NewWorkflowInput {
  readonly strategyId: string;
  readonly machineId: string;
  readonly resources: WorkflowResources;
  /** Start the Workflow straight after it is created. */
  readonly startNow: boolean;
}
