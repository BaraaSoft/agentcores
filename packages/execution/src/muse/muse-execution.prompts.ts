import type { Size } from '../driver/types/size';
import { buildSystemPrompt } from '../computer-use/execution.prompts';
import type { SystemPromptInput } from '../computer-use/types/system-prompt-input';

/**
 * The shared execution system prompt, with the rules Muse needs first. Without the pixel rule, Muse answers on a
 * 0–1000 grid and every click misses; without the tool rule, it sometimes ends a task in plain text; without the
 * pace rules, it sends one action per turn and a screenshot in the next, so a step costs twice the turns.
 */
export function buildMuseSystemPrompt(input: SystemPromptInput & { readonly screenshotSize: Size }): string {
  const { width, height } = input.screenshotSize;
  return `<SCREEN>
* Screenshots are ${width}x${height} pixels. Every coordinate you send, for clicks, drags, scrolls, and zoom regions, is in pixels of that screenshot: x from 0 to ${width - 1}, y from 0 to ${height - 1}. Never use a normalized 0-1000 scale.
* A zoom returns a magnified image of the region. Keep using full-screenshot pixels after it.
* Every turn calls at least one tool. A turn with only text does not end the task; only submit_task_report does.
</SCREEN>

<PACE>
* Every turn is slow, so do as much as you safely can in each one. Actions return no image; only screenshot and zoom do.
* Group the actions whose result you can predict, and end the group with a screenshot call in the same turn. For example: left_click on a field, type the text, key Return, screenshot. Most turns send 2 to 6 actions.
* Never send one action alone and the screenshot in the next turn: that spends two turns on one action.
* An action you cannot predict or cannot undo, such as a submit, a publish, or opening a page you have not seen, ends its turn: put it last, then the screenshot.
</PACE>

${buildSystemPrompt(input)}`;
}

/** Sent when Muse ends a turn without a tool call. */
export const MUSE_NUDGE =
  'Every turn must call a tool. If the instruction is finished, or you are blocked, call submit_task_report alone now; otherwise take your next action.';
