import type Anthropic from '@anthropic-ai/sdk';
import { TASK_REPORT_TOOL } from '../task-report/task-report-tool';

const { name, description, input_schema } = TASK_REPORT_TOOL as unknown as Anthropic.Messages.Tool;

/**
 * `submit_task_report` as a plain tool, with the same name, description, and schema the Claude loop sends.
 * `strict` is left out: Meta ignores it, so the loop repairs and checks the report itself.
 */
export const MUSE_TASK_REPORT_TOOL: Anthropic.Messages.Tool = { name, description, input_schema };
