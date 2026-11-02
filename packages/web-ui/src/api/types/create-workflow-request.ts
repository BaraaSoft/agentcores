/** The body of `POST /workflows`: one Strategy on one machine, inside its limits. */
export interface CreateWorkflowRequest {
  readonly strategyId: string;
  readonly machineId: string;
  readonly resources: {
    /** Jobs that may be active at once. Tasks still take turns on the screen. */
    readonly maxConcurrentJobs: number;
    /** Monthly spend ceiling in USD. */
    readonly budgetLimit: number;
  };
}
