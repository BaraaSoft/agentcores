import type { StepRecord } from './step-record';

/**
 * Context for deciding the next step of a Task.
 */
export interface PlanNextStepInput {
  readonly taskAction: string;
  readonly jobObjective: string;
  readonly safeContext: string;
  readonly history: readonly StepRecord[];
}
