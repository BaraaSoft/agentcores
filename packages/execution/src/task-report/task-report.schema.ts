import { BLOCKER_KINDS, EXECUTION_STATUSES } from '@ahe/agent-core';
import * as z from 'zod/v4';

/**
 * The input of the `submit_task_report` tool. Sent as a strict tool schema, so the API guarantees
 * the model's report matches it. Every field is required (strict mode has no optional fields);
 * metric readings are a list because strict mode doesn't allow open-ended maps.
 */
export const TASK_REPORT_SCHEMA = z.object({
  status: z
    .enum(EXECUTION_STATUSES)
    .describe('"done" when the instruction is finished, "blocked" when a gate stopped you, "failed" when it cannot be done.'),
  summary: z
    .string()
    .describe(
      'At most 100 words on the final state relevant to the instruction: what was done, what is visible now, anything surprising.',
    ),
  locationPath: z
    .string()
    .describe(
      'Where the work of the instruction lives, not just where the screen ended: the permalink of what you created or changed ' +
        '(the exact address of that item, not a home page or feed), an absolute file path, or the app name for a native app. ' +
        'Empty when nothing was located.',
    ),
  locationDetails: z
    .string()
    .describe(
      'Only for a view inside software with no address: very brief steps to reach it, as "<app> → <section> → <item>". ' +
        'Empty for web pages and files.',
    ),
  blocker: z
    .object({
      kind: z.enum(BLOCKER_KINDS),
      detail: z.string().describe('What the gate said and where it appeared.'),
    })
    .nullable()
    .describe('The gate that stopped you when status is "blocked"; otherwise null.'),
  metricReadings: z
    .array(
      z.object({
        name: z.string().describe('snake_case name of what was read, in the words the instruction used for it.'),
        value: z.number(),
      }),
    )
    .describe('Numbers visible in the final state that the instruction asks about. Empty when there are none.'),
});

export type TaskReport = z.infer<typeof TASK_REPORT_SCHEMA>;
