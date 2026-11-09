import type { ToolCall } from '@agentcores/agent-core';
import type {
  BetaComputerHoldKeyInput,
  BetaComputerKeyInput,
  BetaComputerLeftClickDragInput,
  BetaComputerLeftClickInput,
  BetaComputerMemberInput,
  BetaComputerMemberName,
  BetaComputerMouseMoveInput,
  BetaComputerScrollInput,
  BetaComputerTypeInput,
  BetaComputerWaitInput,
  BetaComputerZoomInput,
} from '@anthropic-ai/sdk/resources/beta';
import { ActionRefusedError } from '../actions/action-refused.error';
import type { Point } from '../driver/types/point';

type ClickMember = 'left_click' | 'right_click' | 'middle_click' | 'double_click' | 'triple_click';

const CLICKS: Readonly<Record<ClickMember, Pick<Extract<ToolCall, { kind: 'click' }>, 'button' | 'clickCount'>>> = {
  left_click: { button: 'left', clickCount: 1 },
  right_click: { button: 'right', clickCount: 1 },
  middle_click: { button: 'middle', clickCount: 1 },
  double_click: { button: 'left', clickCount: 2 },
  triple_click: { button: 'left', clickCount: 3 },
};

/**
 * Translates one `computer_toolset_20260801` member call into our ToolCall.
 * This is the only file that knows Anthropic's member names and input shapes;
 * supporting another provider's computer-use format means writing a sibling of this mapper.
 */
export class ToolCallMapper {
  /**
   * Maps a member name and its input. Throws ActionRefusedError for malformed input
   * (e.g. a coordinate that isn't `[x, y]`) so the model can correct it.
   */
  static fromMember(member: BetaComputerMemberName, input: BetaComputerMemberInput): ToolCall {
    switch (member) {
      case 'screenshot':
        return { kind: 'screenshot' };
      case 'zoom': {
        const [x0, y0, x1, y1] = ToolCallMapper.numbers((input as BetaComputerZoomInput).region, 4, 'region');
        return { kind: 'zoom', from: { x: x0, y: y0 }, to: { x: x1, y: y1 } };
      }
      case 'left_click':
      case 'right_click':
      case 'middle_click':
      case 'double_click':
      case 'triple_click': {
        const click = input as BetaComputerLeftClickInput;
        return {
          kind: 'click',
          ...CLICKS[member],
          at: ToolCallMapper.optionalPoint(click.coordinate),
          modifiers: click.text ?? null,
        };
      }
      case 'left_click_drag': {
        const drag = input as BetaComputerLeftClickDragInput;
        return {
          kind: 'drag',
          from: ToolCallMapper.point(drag.start_coordinate, 'start_coordinate'),
          to: ToolCallMapper.point(drag.coordinate, 'coordinate'),
          modifiers: drag.text ?? null,
        };
      }
      case 'mouse_move':
        return { kind: 'mouseMove', to: ToolCallMapper.point((input as BetaComputerMouseMoveInput).coordinate, 'coordinate') };
      case 'left_mouse_down':
        return { kind: 'mouseDown' };
      case 'left_mouse_up':
        return { kind: 'mouseUp' };
      case 'cursor_position':
        return { kind: 'cursorPosition' };
      case 'scroll': {
        const scroll = input as BetaComputerScrollInput;
        return {
          kind: 'scroll',
          at: ToolCallMapper.optionalPoint(scroll.coordinate),
          direction: scroll.scroll_direction,
          amount: scroll.scroll_amount,
          modifiers: scroll.text ?? null,
        };
      }
      case 'type':
        return { kind: 'type', text: (input as BetaComputerTypeInput).text };
      case 'key': {
        const key = input as BetaComputerKeyInput;
        return { kind: 'key', combo: key.text, repeat: key.repeat ?? 1 };
      }
      case 'hold_key': {
        const hold = input as BetaComputerHoldKeyInput;
        return { kind: 'holdKey', combo: hold.text, milliseconds: hold.duration * 1000 };
      }
      case 'wait':
        return { kind: 'wait', milliseconds: (input as BetaComputerWaitInput).duration * 1000 };
    }
  }

  private static optionalPoint(coordinate: number[] | null | undefined): Point | null {
    return coordinate === null || coordinate === undefined ? null : ToolCallMapper.point(coordinate, 'coordinate');
  }

  private static point(coordinate: number[], field: string): Point {
    const [x, y] = ToolCallMapper.numbers(coordinate, 2, field);
    return { x, y };
  }

  /** Checks a model array holds exactly `count` finite numbers. */
  private static numbers(values: number[], count: number, field: string): number[] {
    if (!Array.isArray(values) || values.length !== count || !values.every(Number.isFinite)) {
      throw new ActionRefusedError(`${field} must be ${count} numbers.`);
    }
    return values;
  }
}
