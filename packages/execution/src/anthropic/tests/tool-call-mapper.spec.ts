import { ActionRefusedError } from '../../actions/action-refused.error';
import { ToolCallMapper } from '../tool-call-mapper';

describe('ToolCallMapper', () => {
  it('maps click members to a button and click count', () => {
    expect(ToolCallMapper.fromMember('double_click', { coordinate: [10, 20], text: 'shift' })).toEqual({
      kind: 'click',
      button: 'left',
      clickCount: 2,
      at: { x: 10, y: 20 },
      modifiers: 'shift',
    });
    expect(ToolCallMapper.fromMember('middle_click', {})).toMatchObject({ button: 'middle', at: null, modifiers: null });
  });

  it('maps a drag from start_coordinate to coordinate', () => {
    expect(ToolCallMapper.fromMember('left_click_drag', { start_coordinate: [1, 2], coordinate: [3, 4] })).toEqual({
      kind: 'drag',
      from: { x: 1, y: 2 },
      to: { x: 3, y: 4 },
      modifiers: null,
    });
  });

  it('maps zoom corners', () => {
    expect(ToolCallMapper.fromMember('zoom', { region: [0, 0, 100, 50] })).toEqual({
      kind: 'zoom',
      from: { x: 0, y: 0 },
      to: { x: 100, y: 50 },
    });
  });

  it('converts durations from seconds to milliseconds and defaults repeat to 1', () => {
    expect(ToolCallMapper.fromMember('wait', { duration: 1.5 })).toEqual({ kind: 'wait', milliseconds: 1500 });
    expect(ToolCallMapper.fromMember('hold_key', { text: 'shift', duration: 2 })).toEqual({
      kind: 'holdKey',
      combo: 'shift',
      milliseconds: 2000,
    });
    expect(ToolCallMapper.fromMember('key', { text: 'Return' })).toEqual({ kind: 'key', combo: 'Return', repeat: 1 });
  });

  it('refuses a malformed coordinate', () => {
    expect(() => ToolCallMapper.fromMember('mouse_move', { coordinate: [1] })).toThrow(ActionRefusedError);
  });
});
