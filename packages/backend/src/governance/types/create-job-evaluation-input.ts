/**
 * Opens the judgement of one Job. Creating it twice is harmless: the second call returns the row the
 * first one made, so a repeated scheduling pass never judges a Job twice.
 */
export interface CreateJobEvaluationInput {
  /** The owner of the Job's Strategy. */
  readonly owner: string;
  readonly jobId: string;
  readonly unitOfWorkId: string;
}
