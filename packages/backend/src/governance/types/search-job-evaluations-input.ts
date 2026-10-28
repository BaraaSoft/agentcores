/**
 * Asks for the scored Jobs whose objective is closest in meaning to `objective`, within one
 * Workflow. `maxScore` narrows it to the ones that went badly, which is what the planner wants
 * when it is looking for mistakes to avoid.
 */
export interface SearchJobEvaluationsInput {
  readonly workflowId: string;
  readonly objective: string;
  readonly limit: number;
  readonly maxScore?: number;
}
