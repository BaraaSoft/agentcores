import * as z from 'zod/v4';
import { MAX_JOB_SCORE, MIN_JOB_SCORE } from '../evaluation-reasoning.constants';

const SCORED = z.object({
  verdict: z.literal('scored').describe('"scored": you can judge the Job from what is on record.'),
  rubric: z.string().describe('The standard you held the Job to and where the evidence came from. One or two sentences.'),
  score: z
    .number()
    .int()
    .min(MIN_JOB_SCORE)
    .max(MAX_JOB_SCORE)
    .describe('1-10 against the objective, on the scale in the rules. When you cannot mark the Job yet, ask for evidence instead.'),
  objectiveSummary: z
    .string()
    .describe(
      'What this Job set out to do, in general terms — the kind of work, the medium, and the intent, ' +
        'with names, numbers, and one-off specifics left out.',
    ),
  whatGood: z.string().describe('What worked, as advice to the next planner. Brief and specific. Empty string when nothing did.'),
  whatBad: z.string().describe('What went wrong and must not be repeated, same voice. Empty string when nothing did.'),
});

const NEEDS_EVIDENCE = z.object({
  verdict: z.literal('needs_evidence').describe('"needs_evidence": its real outcome has to be read in the world first.'),
  rubric: z.string().describe('Why that evidence decides the score. One or two sentences.'),
  evidenceJobName: z.string().describe('A short name for the Job that reads the evidence.'),
  evidenceObjective: z
    .string()
    .min(1)
    .describe('Exactly what that Job must find out and where, concrete enough for a computer-use agent to carry out.'),
  evidenceCriteria: z
    .array(
      z.object({
        key: z.string().describe('Short snake_case name of the quality, which the reading comes back under.'),
        whatToExamine: z
          .string()
          .describe('What to look at and what would make it good, in one sentence an agent looking at the work can act on.'),
      }),
    )
    .describe(
      'Where the mark turns on quality that has to be seen: what to rate once the work is open, drawn from what you ' +
        'learnt about how this kind of work is done well. Each comes back as a 1-10 reading under its key. ' +
        'Empty when the errand is only reading a figure off a page.',
    ),
});

/**
 * What `judgeJob` must answer: one branch per verdict, so the decoder makes the model give every field
 * its verdict needs — a score, or the evidence to fetch — and none of the other's. `scored` stays first:
 * with `needs_evidence` first, Claude asked for evidence on work it could plainly mark. No decoder
 * enforces the score's range, so zod rejects a score off the scale (a model unsure of the mark wrote 0)
 * and the queue tries again, rather than the mark being clamped into a fake 1.
 */
export const JOB_JUDGEMENT_OUTPUT_SCHEMA = z.discriminatedUnion('verdict', [SCORED, NEEDS_EVIDENCE]);
