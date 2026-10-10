import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { TASK_REPORT_SCHEMA } from './task-report.schema';

/**
 * The tool the execution model calls once, alone, to end a task. The provider stops the loop as soon as
 * it sees that call, so `run` only answers when the report came in the same turn as other actions,
 * whose outcome the model hasn't seen yet.
 */
export const TASK_REPORT_TOOL = {
  ...betaZodTool({
    name: 'submit_task_report',
    description:
      'End the task with a report for the planner. Call it when the instruction is done, you are blocked, or you are certain it cannot be done. Call it alone, never together with computer actions.',
    inputSchema: TASK_REPORT_SCHEMA,
    run: () => 'Report not accepted: it was sent together with computer actions. Check their outcome with a screenshot, then call submit_task_report alone.',
  }),
  strict: true,
};
