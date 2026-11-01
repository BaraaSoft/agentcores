import { JOB_ORDER_TYPES } from '@ahe/agent-core';
import * as z from 'zod/v4';

const PLANNED_JOB = z.object({
  name: z.string().describe('A short name for the Job, under 80 characters.'),
  objective: z
    .string()
    .min(1)
    .describe(
      'One clear outcome for a computer-use agent: what to produce or achieve, where, and how to tell it is done. ' +
        'Concrete enough to plan Tasks from, without listing the Tasks.',
    ),
  orderType: z
    .enum(JOB_ORDER_TYPES)
    .describe('"ordered": must wait for the ordered Jobs listed before it to succeed. "unordered": can run at any time.'),
});

const PLAN = z.object({
  decision: z.literal('plan').describe('"plan": here are the Jobs for this Unit.'),
  title: z
    .string()
    .describe('The idea this Unit of Work tests, in one line under 80 characters: what changes from the Units before it.'),
  rationale: z.string().describe('Two or three sentences: what this Unit tries and why, given what earlier Units taught.'),
  jobs: z.array(PLANNED_JOB).min(1).describe('The Jobs, in the order they should run.'),
});

const DONE = z.object({
  decision: z.literal('done').describe('"done": the outcome is already met — only when the rules allow it.'),
  rationale: z.string().describe('Two or three sentences: why the outcome is met.'),
});

/**
 * What `planUnitOfWork` must answer: one branch per decision, so the decoder makes a plan carry at
 * least one Job, and `done` carry only its reason.
 */
export const UNIT_OF_WORK_PLAN_OUTPUT_SCHEMA = z.discriminatedUnion('decision', [PLAN, DONE]);
