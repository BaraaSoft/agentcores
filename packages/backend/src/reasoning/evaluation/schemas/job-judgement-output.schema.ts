import * as z from 'zod/v4';
import { JOB_JUDGEMENT_VERDICTS } from '../types/job-judgement-verdict';

/**
 * What `judgeJob` must answer. Sent as the JSON schema output format, so every field is required:
 * the fields belonging to the other verdict come back null, and the service turns the flat answer
 * into a `ScoredJob` or an `EvidenceRequest`.
 */
export const JOB_JUDGEMENT_OUTPUT_SCHEMA = z.object({
  verdict: z
    .enum(JOB_JUDGEMENT_VERDICTS)
    .describe(
      '"scored": you can judge the Job from what is on record. ' +
        '"needs_evidence": its real outcome has to be read in the world first.',
    ),
  rubric: z
    .string()
    .describe(
      'For "scored": the standard you held the Job to and where the evidence came from. ' +
        'For "needs_evidence": why that evidence decides the score. One or two sentences.',
    ),
  score: z
    .number()
    .int()
    .nullable()
    .describe('For "scored": 1-10 against the objective, on the scale in the rules. Null for "needs_evidence".'),
  objectiveSummary: z
    .string()
    .nullable()
    .describe(
      'For "scored": what this Job set out to do, in general terms — the kind of work, the medium, and the intent, ' +
        'with names, numbers, and one-off specifics left out. Null for "needs_evidence".',
    ),
  whatGood: z
    .string()
    .nullable()
    .describe('For "scored": what worked, as advice to the next planner. Brief and specific. Empty string when nothing did.'),
  whatBad: z
    .string()
    .nullable()
    .describe('For "scored": what went wrong and must not be repeated, same voice. Empty string when nothing did.'),
  evidenceJobName: z.string().nullable().describe('For "needs_evidence": a short name for the Job that reads the evidence.'),
  evidenceObjective: z
    .string()
    .nullable()
    .describe(
      'For "needs_evidence": exactly what that Job must find out and where, concrete enough for a computer-use ' +
        'agent to carry out. Null for "scored".',
    ),
});
