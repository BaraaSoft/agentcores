/**
 * Judge one Job. The orchestrator sends one per Job when the Job's Unit of Work is due for judgement,
 * and `JobExecutionProcessor` sends one again when a Job that was gathering evidence for it closes. The
 * message says only which judgement to work on; how far along it is lives in the row's `state`.
 * `workflowId` is the machine an evidence Job is sent to, if the judgement needs one.
 */
export interface JobEvaluationJobData {
  readonly workflowId: string;
  readonly evaluationId: string;
}
