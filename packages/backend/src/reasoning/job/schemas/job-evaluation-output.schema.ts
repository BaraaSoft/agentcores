import * as z from 'zod/v4';

/**
 * What `evaluateJob` must answer for a Job still open at cycle end. The service adds the Job's ID,
 * name, and null outcome to make the `JobEvaluation`.
 */
export const JOB_EVALUATION_OUTPUT_SCHEMA = z.object({
  summary: z
    .string()
    .describe('A few sentences on what the Tasks achieved against the objective, with the metric readings that matter.'),
  followUpActions: z
    .array(z.string())
    .describe('Task actions that would finish the objective next cycle, in order; empty when nothing would.'),
});
