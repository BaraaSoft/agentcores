import * as z from 'zod/v4';

const RATIONALE = z
  .string()
  .describe('Why, in one or two sentences, citing the outcome that drove it. For "abandon", this is the reason to stop.');

const SUMMARY = z.string().describe('What the Job has achieved so far and where it stands, in a few sentences.');

const REVISE = z.object({
  decision: z.literal('revise').describe('"revise": the plan should change.'),
  rationale: RATIONALE,
  revisionNotes: z.string().min(1).describe('What should change in the plan and why, for the planner to act on.'),
  summary: SUMMARY,
});

const SETTLED = z.object({
  decision: z
    .enum(['continue', 'met', 'abandon'])
    .describe('"continue": the plan still fits. "met": the objective is achieved. "abandon": the Job is not worth continuing.'),
  rationale: RATIONALE,
  summary: SUMMARY,
});

/**
 * What `reviewJob` must answer after a Task finishes: one branch for `revise`, so the decoder makes a
 * revision carry its notes, and one for the decisions that need none.
 */
export const JOB_REVIEW_SCHEMA = z.discriminatedUnion('decision', [REVISE, SETTLED]);
