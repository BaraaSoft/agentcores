import type { Size } from '../driver/types/size';
import { buildSystemPrompt } from '../computer-use/execution.prompts';
import type { SystemPromptInput } from '../computer-use/types/system-prompt-input';

/**
 * The shared execution system prompt, with the rules Muse needs first. Without the pixel rule, Muse answers on a
 * 0–1000 grid and every click misses; without the tool rule, it sometimes ends a task in plain text.
 */
export function buildMuseSystemPrompt(input: SystemPromptInput & { readonly screenshotSize: Size }): string {
  const { width, height } = input.screenshotSize;
  return `<SCREEN>
* Screenshots are ${width}x${height} pixels. Every coordinate you send, for clicks, drags, scrolls, and zoom regions, is in pixels of that screenshot: x from 0 to ${width - 1}, y from 0 to ${height - 1}. Never use a normalized 0-1000 scale.
* A zoom returns a magnified image of the region. Keep using full-screenshot pixels after it.
* Every turn calls at least one tool. A turn with only text does not end the task; only submit_task_report does.
</SCREEN>

${buildSystemPrompt(input)}`;
}

/** Sent when Muse ends a turn without a tool call. */
export const MUSE_NUDGE =
  'Every turn must call a tool. If the instruction is finished, or you are blocked, call submit_task_report alone now; otherwise take your next action.';
