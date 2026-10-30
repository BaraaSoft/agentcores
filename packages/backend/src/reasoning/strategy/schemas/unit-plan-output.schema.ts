import { JOB_ORDER_TYPES } from '@ahe/agent-core';
import * as z from 'zod/v4';

/**
 * What `planUnitOfWork` must answer. Sent as the JSON schema output format, so every field is required;
 * `jobs` comes back empty for `done`, and the service turns the flat answer into a `UnitPlan`.
 */
export const UNIT_PLAN_OUTPUT_SCHEMA = z.object({
  decision: z
    .enum(['plan', 'done'])
    .describe('"plan": here are the Jobs for this Unit. "done": the outcome is already met — only when the rules allow it.'),
  rationale: z
    .string()
    .describe('Two or three sentences: what this Unit tries and why, given what earlier Units taught. For "done", why the outcome is met.'),
  jobs: z
    .array(
      z.object({
        name: z.string().describe('A short name for the Job, under 80 characters.'),
        objective: z
          .string()
          .describe(
            'One clear outcome for a computer-use agent: what to produce or achieve, where, and how to tell it is done. ' +
              'Concrete enough to plan Tasks from, without listing the Tasks.',
          ),
        orderType: z
          .enum(JOB_ORDER_TYPES)
          .describe('"ordered": must wait for the ordered Jobs listed before it to succeed. "unordered": can run at any time.'),
      }),
    )
    .describe('The Jobs, in the order they should run. Empty for "done".'),
});
