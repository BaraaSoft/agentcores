/**
 * Asks for the Workflow's Jobs that did something on one day, which is the set the daily
 * evaluation judges.
 */
export interface ListJobsWithActivityInput {
  readonly workflowId: string;
  /** The day in question, as `YYYY-MM-DD`. */
  readonly evaluationDate: string;
}
