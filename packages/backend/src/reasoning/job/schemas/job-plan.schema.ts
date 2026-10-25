import * as z from 'zod/v4';

/**
 * What `planTasks` must answer. Sent as the JSON schema output format, so every field is required;
 * `abandonReason` is null rather than absent when the Job goes on.
 */
export const JOB_PLAN_SCHEMA = z.object({
  rationale: z.string().describe('Why this plan or decision, in one or two sentences, citing the outcome that drove it.'),
  remainingActions: z
    .array(z.string())
    .describe('Every Task still to run, in order; each one concrete action with a clear end. Empty when the Job is over.'),
  isObjectiveMet: z.boolean().describe('True only when the outcomes show the objective is achieved.'),
  abandonReason: z
    .string()
    .nullable()
    .describe('Why you decided the Job is not worth continuing; null to keep going. Never because Tasks keep failing.'),
  summary: z.string().describe('What the Job has achieved so far and where it stands, in a few sentences.'),
});
