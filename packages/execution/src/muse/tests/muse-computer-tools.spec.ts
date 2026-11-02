import { ActionRefusedError } from '../../actions/action-refused.error';
import { MuseComputerTools } from '../muse-computer-tools';

describe('MuseComputerTools', () => {
  const tools = new MuseComputerTools({ width: 1280, height: 800 }, true);

  it('offers every computer action as a plain tool with a JSON schema', () => {
    const definitions = tools.definitions();

    expect(definitions.map((tool) => tool.name)).toEqual([
      'screenshot',
      'zoom',
      'left_click',
      'double_click',
      'triple_click',
      'right_click',
      'middle_click',
      'left_click_drag',
      'mouse_move',
      'left_mouse_down',
      'left_mouse_up',
      'cursor_position',
      'scroll',
      'type',
      'key',
      'hold_key',
      'wait',
    ]);
    expect(definitions.find((tool) => tool.name === 'left_click')?.input_schema).toMatchObject({
      type: 'object',
      properties: { coordinate: { type: 'array', minItems: 2, maxItems: 2 } },
    });
    expect(definitions.every((tool) => !('type' in tool))).toBe(true);
  });

  it('hides triple_click when the pointer cannot triple-click', () => {
    const names = new MuseComputerTools({ width: 1280, height: 800 }, false).definitions().map((tool) => tool.name);
    expect(names).not.toContain('triple_click');
  });

  it.each([
    ['screenshot', {}, { kind: 'screenshot' }],
    ['left_click', { coordinate: [10, 20] }, { kind: 'click', button: 'left', clickCount: 1, at: { x: 10, y: 20 }, modifiers: null }],
    [
      'left_click',
      { coordinate: [352, 363], text: 'cmd' },
      { kind: 'click', button: 'left', clickCount: 1, at: { x: 352, y: 363 }, modifiers: 'cmd' },
    ],
    [
      'double_click',
      { coordinate: [1, 2], text: null },
      { kind: 'click', button: 'left', clickCount: 2, at: { x: 1, y: 2 }, modifiers: null },
    ],
    ['right_click', {}, { kind: 'click', button: 'right', clickCount: 1, at: null, modifiers: null }],
    [
      'left_click_drag',
      { start_coordinate: [1, 2], coordinate: [3, 4] },
      { kind: 'drag', from: { x: 1, y: 2 }, to: { x: 3, y: 4 }, modifiers: null },
    ],
    ['mouse_move', { coordinate: [5, 6] }, { kind: 'mouseMove', to: { x: 5, y: 6 } }],
    ['left_mouse_down', {}, { kind: 'mouseDown' }],
    ['left_mouse_up', {}, { kind: 'mouseUp' }],
    ['cursor_position', {}, { kind: 'cursorPosition' }],
    [
      'scroll',
      { coordinate: [7, 8], scroll_direction: 'down', scroll_amount: 5 },
      { kind: 'scroll', at: { x: 7, y: 8 }, direction: 'down', amount: 5, modifiers: null },
    ],
    ['type', { text: 'café 🚀' }, { kind: 'type', text: 'café 🚀' }],
    ['key', { text: 'Tab', repeat: 3 }, { kind: 'key', combo: 'Tab', repeat: 3 }],
    ['key', { text: 'Return' }, { kind: 'key', combo: 'Return', repeat: 1 }],
    ['hold_key', { text: 'Shift', duration: 2 }, { kind: 'holdKey', combo: 'Shift', milliseconds: 2000 }],
    ['wait', { duration: 1.5 }, { kind: 'wait', milliseconds: 1500 }],
  ])('maps %s %j to a ToolCall', (name, input, expected) => {
    expect(tools.toToolCall(name, input)).toEqual(expected);
  });

  it('keeps a zoom region on the screenshot when Muse writes a corner off it', () => {
    expect(tools.toToolCall('zoom', { region: [1170, 965, 1275, 795] })).toEqual({
      kind: 'zoom',
      from: { x: 1170, y: 799 },
      to: { x: 1275, y: 795 },
    });
  });

  it('refuses an unknown tool with a message for the model', () => {
    expect(() => tools.toToolCall('open_app', {})).toThrow(new ActionRefusedError('There is no tool called "open_app".'));
  });

  it('refuses malformed input with a message for the model', () => {
    expect(() => tools.toToolCall('left_click_drag', { coordinate: [1, 2] })).toThrow(ActionRefusedError);
    expect(() => tools.toToolCall('left_click', { coordinate: [1] })).toThrow(/Invalid input for left_click/);
  });
});
