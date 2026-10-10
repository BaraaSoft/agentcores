/**
 * Points a Workflow at the Strategy it should run now.
 */
export interface SetActiveStrategyInput {
  readonly workflowId: string;
  readonly strategyId: string;
}
