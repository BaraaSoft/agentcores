import * as z from 'zod/v4';
import { JOB_REVIEW_DECISIONS } from '../types/job-review-decision';

/**
 * What `reviewJob` must answer after a Task finishes. Sent as the JSON schema output format, so every
 * field is required; `revisionNotes` is null unless the decision is `revise`.
 */
export const JOB_REVIEW_SCHEMA = z.object({
  decision: z
    .enum(JOB_REVIEW_DECISIONS)
    .describe(
      '"continue": the plan still fits. "revise": the plan should change. "met": the objective is achieved. ' +
        '"abandon": the Job is not worth continuing.',
    ),
  rationale: z
    .string()
    .describe('Why, in one or two sentences, citing the outcome that drove it. For "abandon", this is the reason to stop.'),
  revisionNotes: z
    .string()
    .nullable()
    .describe('For "revise": what should change in the plan and why, for the planner to act on. Otherwise null.'),
  summary: z.string().describe('What the Job has achieved so far and where it stands, in a few sentences.'),
});
