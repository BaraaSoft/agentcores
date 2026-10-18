import type { ExecutionResult, ExecutionTask } from '@ahe/agent-core';
import type { PlannedStep } from './planned-step';

/**
 * One executed step: what was sent to the execution layer and what came back, unchanged.
 */
export interface StepRecord {
  readonly instruction: ExecutionTask['instruction'];
  readonly platform: PlannedStep['platform'];
  readonly result: ExecutionResult;
}
