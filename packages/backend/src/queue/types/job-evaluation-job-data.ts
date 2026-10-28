/**
 * Work on the evaluation queue, of which there are two kinds. Both carry `workflowId`, because every
 * worker checks the Workflow is still `running` before it does anything.
 *
 * - `sweep`: find every Job of the Workflow that saw activity on `evaluationDate` and open a judgement
 *   for each. One of these per Workflow per day, from the daily cron. The date is carried rather than
 *   read from the clock inside the worker, so a retry judges the day it was meant to.
 * - `judge`: mark one Job. Sent by the sweep for each Job it found, and again by
 *   `JobExecutionProcessor` when a Job that was gathering evidence closes. Both say only which
 *   judgement to work on; how far along it is lives in the row's `state`, not in the message.
 */
export type JobEvaluationJobData =
  | { readonly kind: 'sweep'; readonly workflowId: string; readonly evaluationDate: string }
  | { readonly kind: 'judge'; readonly workflowId: string; readonly evaluationId: string };
