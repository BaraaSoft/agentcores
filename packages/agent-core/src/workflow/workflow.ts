import type { WorkflowResources } from './workflow-resources';
import type { WorkflowState } from './workflow-state';

/**
 * One machine's run of a Strategy: the resources it may use there and its lifecycle state. A
 * Strategy can run on several machines at once, each through its own Workflow.
 */
export interface Workflow {
  readonly id: string;
  readonly strategyId: string;
  /** The machine this Workflow runs on, e.g. its hostname. */
  readonly machineId: string;
  readonly resources: WorkflowResources;
  readonly state: WorkflowState;
}
