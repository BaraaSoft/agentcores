/** One Workflow, as `GET /workflows` lists it. */
export interface WorkflowSummary {
  readonly id: string;
  readonly strategyId: string;
  readonly machineId: string;
  readonly state: 'running' | 'paused';
}
