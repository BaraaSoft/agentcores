import type { ExecutionModel } from '../config/execution-model';
import type { ReasoningModel } from '../config/reasoning-model';

/**
 * The resource envelope a Workflow runs inside. The orchestrator enforces
 * these limits when it decides how many Tasks to schedule and what they may spend.
 */
export interface WorkflowResources {
  readonly reasoningModel: ReasoningModel;
  readonly executionModel: ExecutionModel;
  readonly maxConcurrentTasks: number;
  /** Monthly spend ceiling in USD (paid channels + model usage). */
  readonly budgetLimit: number;
}
