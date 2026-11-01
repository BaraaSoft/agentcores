/**
 * The resource envelope a Workflow runs inside. The orchestrator enforces
 * these limits when it decides how many Jobs to start and what they may spend.
 * The reasoning models come from the backend's config, not from the Workflow.
 */
export interface WorkflowResources {
  /** Jobs of this Workflow that may be active at once. Tasks still run one at a time on the screen. */
  readonly maxConcurrentJobs: number;
  /** Monthly spend ceiling in USD (paid channels + model usage). */
  readonly budgetLimit: number;
}
