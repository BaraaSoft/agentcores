import type { ExecutionModel } from '../config/execution-model';
import type { ReasoningModel } from '../config/reasoning-model';

/**
 * The resource envelope a Workflow runs inside. The orchestrator enforces
 * these limits when it decides how many Jobs to start and what they may spend.
 */
export interface WorkflowResources {
  readonly reasoningModel: ReasoningModel;
  readonly executionModel: ExecutionModel;
  /** Jobs of this Workflow that may be active at once. Tasks still run one at a time on the screen. */
  readonly maxConcurrentJobs: number;
  /** Monthly spend ceiling in USD (paid channels + model usage). */
  readonly budgetLimit: number;
}
