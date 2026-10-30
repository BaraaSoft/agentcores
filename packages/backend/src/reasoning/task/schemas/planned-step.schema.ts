import * as z from 'zod/v4';

/**
 * What `planNextStep` must answer. Sent as the JSON schema output format, so every field is required;
 * the service turns the flat answer into a `PlannedStep`.
 */
export const PLANNED_STEP_SCHEMA = z.object({
  rationale: z
    .string()
    .describe('One or two sentences: what the last result showed, and why this is the next step (or why the Task is done).'),
  isTaskDone: z.boolean().describe('True only when the step results show the Task action is achieved. Then the instruction is empty.'),
  needsHumanJudgment: z
    .boolean()
    .describe(
      'Last resort only. True when no step you can take will move the Task on: the account is signed out and no login ' +
        "was supplied, or the step needs a payment or terms accepted on the owner's behalf.",
    ),
  instruction: z
    .string()
    .describe(
      'The next step for the computer-use agent, complete on its own: where to go, what to do, any text to type in full, ' +
        'how to tell it is done, and which numbers to read back. When needsHumanJudgment, the question for the owner. ' +
        'Empty when isTaskDone.',
    ),
  platform: z
    .string()
    .nullable()
    .describe('The site whose account the step acts as, e.g. "canva.com". Null for local apps and for browsing that needs no login.'),
});
