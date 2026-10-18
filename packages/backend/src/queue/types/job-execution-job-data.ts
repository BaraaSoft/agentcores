/**
 * Payload for a `job-execution` queue job: which Job to break down and move along.
 */
export interface JobExecutionJobData {
  readonly workflowId: string;
  readonly jobId: string;
}
