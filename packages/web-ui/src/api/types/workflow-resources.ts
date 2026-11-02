/** The limits of one Workflow. */
export interface WorkflowResources {
  /** Jobs that may be active at once. Tasks still take turns on the screen. */
  readonly maxConcurrentJobs: number;
  /** Monthly spend ceiling in USD. */
  readonly budgetLimit: number;
}
