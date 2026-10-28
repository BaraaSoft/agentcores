/**
 * Opens a day's judgement of one Job. Creating the same Job and day twice is harmless: the second
 * call returns the row the first one made, so a retried sweep never judges a Job twice.
 */
export interface CreateJobEvaluationInput {
  /** The owner of the Job's Strategy. */
  readonly owner: string;
  readonly jobId: string;
  readonly unitOfWorkId: string;
  /** The day being judged, as `YYYY-MM-DD`. */
  readonly evaluationDate: string;
}
