import type { LaunchStepState } from './launch-step-state';
import type { RunStepId } from './run-step-id';

/** A fresh run of a Strategy that the owner asked for, and how far it is. */
export interface StrategyRun {
  readonly strategyId: string;
  readonly steps: Record<RunStepId, LaunchStepState>;
  /** The Workflow that ran on the machine and was paused for this run. Null when the machine was free. */
  readonly pausedWorkflowId: string | null;
  /** The new Workflow, once the backend made it. */
  readonly workflowId: string | null;
}
