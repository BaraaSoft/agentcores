import type { WorkflowResources } from './workflow-resources';
import type { WorkflowState } from './workflow-state';

/**
 * One run of a Strategy on one machine: the resources it may use and its lifecycle state. A Strategy
 * can have many Workflows over time, one per run. A machine runs one Workflow at a time.
 */
export interface Workflow {
  readonly id: string;
  readonly strategyId: string;
  /** The machine this Workflow runs on, e.g. its hostname. */
  readonly machineId: string;
  readonly resources: WorkflowResources;
  readonly state: WorkflowState;
}
