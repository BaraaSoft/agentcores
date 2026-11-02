import type { WorkflowResources } from './workflow-resources';
import type { WorkflowState } from './workflow-state';

/** One Workflow — one run of a Strategy — as `GET /workflows` lists it. */
export interface WorkflowSummary {
  readonly id: string;
  readonly strategyId: string;
  readonly machineId: string;
  readonly state: WorkflowState;
  readonly resources: WorkflowResources;
  /** How many of its Tasks run now. A paused Workflow with none has freed the machine. */
  readonly activeTaskCount: number;
  /** ISO time the Workflow was created. */
  readonly createdAt: string;
  /** ISO time of the last change, such as a start or a pause. */
  readonly updatedAt: string;
}
