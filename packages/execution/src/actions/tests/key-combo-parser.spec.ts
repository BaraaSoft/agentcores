import { ActionRefusedError } from '../action-refused.error';
import { KeyComboParser } from '../key-combo-parser';

describe('KeyComboParser', () => {
  it.each([
    ['Return', { key: 'enter', modifiers: [] }],
    ['ctrl+s', { key: 's', modifiers: ['control'] }],
    ['alt+Tab', { key: 'tab', modifiers: ['alt'] }],
    ['super+shift+t', { key: 't', modifiers: ['meta', 'shift'] }],
    ['cmd+c', { key: 'c', modifiers: ['meta'] }],
    ['Page_Down', { key: 'pagedown', modifiers: [] }],
    ['BackSpace', { key: 'backspace', modifiers: [] }],
    ['F5', { key: 'f5', modifiers: [] }],
    ['ctrl++', { key: '+', modifiers: ['control'] }],
    ['cmd+minus', { key: '-', modifiers: ['meta'] }],
    ['shift', { key: 'shift', modifiers: [] }],
    ['/', { key: '/', modifiers: [] }],
  ])('parses %s', (text, expected) => {
    expect(KeyComboParser.parse(text)).toEqual(expected);
  });

  it('refuses unknown key names instead of guessing', () => {
    expect(() => KeyComboParser.parse('Hyper_Q')).toThrow(ActionRefusedError);
  });

  it('refuses several keys in one call', () => {
    expect(() => KeyComboParser.parse('ctrl+a ctrl+c')).toThrow(/one key combination per call/);
  });

  it('reads modifier strings, ignoring duplicates', () => {
    expect(KeyComboParser.parseModifiers('ctrl+shift+ctrl')).toEqual(['control', 'shift']);
    expect(KeyComboParser.parseModifiers(null)).toEqual([]);
    expect(() => KeyComboParser.parseModifiers('ctrl+q')).toThrow(ActionRefusedError);
  });
});
