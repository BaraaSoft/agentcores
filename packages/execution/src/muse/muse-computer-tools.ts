import type { ToolCall } from '@agentcores/agent-core';
import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod/v4';
import { ActionRefusedError } from '../actions/action-refused.error';
import type { Point } from '../driver/types/point';
import type { Size } from '../driver/types/size';

const coordinate = z.array(z.number()).length(2).describe('[x, y] in screenshot pixels.');
const modifiers = z.string().optional().describe('Modifier keys to hold during the action, e.g. "cmd" or "shift+cmd".');

/** One computer action offered to Muse: what the model reads, the input it sends, and the ToolCall it becomes. */
interface MuseComputerTool<Input extends z.ZodType> {
  readonly description: string;
  readonly input: Input;
  readonly toToolCall: (input: z.infer<Input>, screenshotSize: Size) => ToolCall;
}

const defineTool = <Input extends z.ZodType>(tool: MuseComputerTool<Input>): MuseComputerTool<Input> => tool;

const point = ([x, y]: number[]): Point => ({ x, y });

/** Keeps a point on the screenshot. Muse sometimes writes one corner of a zoom region on a 0–1000 scale. */
const clampToScreenshot = ({ x, y }: Point, { width, height }: Size): Point => ({
  x: Math.min(Math.max(Math.round(x), 0), width - 1),
  y: Math.min(Math.max(Math.round(y), 0), height - 1),
});

/** Meta does not enforce tool schemas, so Muse may send `null` for an optional field; it means "left out". */
const withoutNulls = (input: unknown): unknown =>
  typeof input === 'object' && input !== null
    ? Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null))
    : (input ?? {});

const click = (description: string, button: 'left' | 'right' | 'middle', clickCount: 1 | 2 | 3) =>
  defineTool({
    description,
    input: z.object({ coordinate: coordinate.optional(), text: modifiers }),
    toToolCall: (input) => ({
      kind: 'click',
      button,
      clickCount,
      at: input.coordinate ? point(input.coordinate) : null,
      modifiers: input.text ?? null,
    }),
  });

/**
 * The computer actions Muse can call, named like Anthropic's computer toolset members so the shared system prompt
 * reads the same. Meta's API runs no computer tool of its own, so these are plain tools.
 */
const TOOLS = {
  screenshot: defineTool({
    description: 'Take a screenshot of the whole screen.',
    input: z.object({}),
    toToolCall: () => ({ kind: 'screenshot' }),
  }),
  zoom: defineTool({
    description: 'Return a magnified view of one screen region, to read small text before acting near it.',
    input: z.object({ region: z.array(z.number()).length(4).describe('[x0, y0, x1, y1] in screenshot pixels.') }),
    toToolCall: ({ region: [x0, y0, x1, y1] }, size) => ({
      kind: 'zoom',
      from: clampToScreenshot({ x: x0, y: y0 }, size),
      to: clampToScreenshot({ x: x1, y: y1 }, size),
    }),
  }),
  left_click: click('Left-click at a point, or at the cursor when no coordinate is given.', 'left', 1),
  double_click: click('Double-click at a point.', 'left', 2),
  triple_click: click('Triple-click at a point, which selects a whole line or paragraph.', 'left', 3),
  right_click: click('Right-click at a point, e.g. to open a context menu.', 'right', 1),
  middle_click: click('Middle-click at a point.', 'middle', 1),
  left_click_drag: defineTool({
    description: 'Press the left button at start_coordinate, drag, and release it at coordinate.',
    input: z.object({ start_coordinate: coordinate, coordinate, text: modifiers }),
    toToolCall: (input) => ({
      kind: 'drag',
      from: point(input.start_coordinate),
      to: point(input.coordinate),
      modifiers: input.text ?? null,
    }),
  }),
  mouse_move: defineTool({
    description: 'Move the pointer to a point.',
    input: z.object({ coordinate }),
    toToolCall: (input) => ({ kind: 'mouseMove', to: point(input.coordinate) }),
  }),
  left_mouse_down: defineTool({
    description: 'Press and hold the left mouse button where the pointer is.',
    input: z.object({}),
    toToolCall: () => ({ kind: 'mouseDown' }),
  }),
  left_mouse_up: defineTool({
    description: 'Release the left mouse button.',
    input: z.object({}),
    toToolCall: () => ({ kind: 'mouseUp' }),
  }),
  cursor_position: defineTool({
    description: 'Return where the pointer is, in screenshot pixels.',
    input: z.object({}),
    toToolCall: () => ({ kind: 'cursorPosition' }),
  }),
  scroll: defineTool({
    description: 'Scroll at a point, or at the cursor when no coordinate is given.',
    input: z.object({
      coordinate: coordinate.optional(),
      scroll_direction: z.enum(['up', 'down', 'left', 'right']),
      scroll_amount: z.number().describe('How many scroll clicks, from 1 to 20.'),
      text: modifiers,
    }),
    toToolCall: (input) => ({
      kind: 'scroll',
      at: input.coordinate ? point(input.coordinate) : null,
      direction: input.scroll_direction,
      amount: input.scroll_amount,
      modifiers: input.text ?? null,
    }),
  }),
  type: defineTool({
    description: 'Type text where the keyboard focus is.',
    input: z.object({ text: z.string() }),
    toToolCall: (input) => ({ kind: 'type', text: input.text }),
  }),
  key: defineTool({
    description: 'Press a key or a combo, e.g. "Return", "Tab", or "cmd+a", optionally several times.',
    input: z.object({ text: z.string(), repeat: z.number().optional().describe('How many presses; 1 when left out.') }),
    toToolCall: (input) => ({ kind: 'key', combo: input.text, repeat: input.repeat ?? 1 }),
  }),
  hold_key: defineTool({
    description: 'Hold a key or a combo down for some seconds.',
    input: z.object({ text: z.string(), duration: z.number().describe('Seconds.') }),
    toToolCall: (input) => ({ kind: 'holdKey', combo: input.text, milliseconds: input.duration * 1000 }),
  }),
  wait: defineTool({
    description: 'Wait some seconds, e.g. for a page to load.',
    input: z.object({ duration: z.number().describe('Seconds.') }),
    toToolCall: (input) => ({ kind: 'wait', milliseconds: input.duration * 1000 }),
  }),
} satisfies Record<string, MuseComputerTool<z.ZodType>>;

type MuseToolName = keyof typeof TOOLS;

/**
 * The computer tools of one task: their definitions for the request, and the mapping from a Muse call to a ToolCall.
 * One instance serves one task, because coordinates are only meaningful for that task's screenshot size.
 */
export class MuseComputerTools {
  /**
   * @param screenshotSize the size of every screenshot in this task
   * @param isTripleClickEnabled false when the pointer driver can't triple-click; the tool is then not offered
   */
  constructor(
    private readonly screenshotSize: Size,
    private readonly isTripleClickEnabled: boolean,
  ) {}

  /** The tool definitions sent with every request. */
  definitions(): Anthropic.Messages.Tool[] {
    return this.offeredNames().map((name) => ({
      name,
      description: TOOLS[name].description,
      input_schema: z.toJSONSchema(TOOLS[name].input) as Anthropic.Messages.Tool.InputSchema,
    }));
  }

  /** True when `name` is one of the computer tools offered in this task. */
  has(name: string): name is MuseToolName {
    return this.offeredNames().some((offered) => offered === name);
  }

  /**
   * Maps one Muse call to a ToolCall. Throws ActionRefusedError for an unknown tool or malformed input,
   * with a message the model can act on.
   */
  toToolCall(name: string, input: unknown): ToolCall {
    if (!this.has(name)) throw new ActionRefusedError(`There is no tool called "${name}".`);
    const tool: MuseComputerTool<z.ZodType> = TOOLS[name];
    const parsed = tool.input.safeParse(withoutNulls(input));
    if (!parsed.success) {
      throw new ActionRefusedError(`Invalid input for ${name}: ${z.prettifyError(parsed.error)}`);
    }
    return tool.toToolCall(parsed.data, this.screenshotSize);
  }

  private offeredNames(): MuseToolName[] {
    const names = Object.keys(TOOLS) as MuseToolName[];
    return this.isTripleClickEnabled ? names : names.filter((name) => name !== 'triple_click');
  }
}
