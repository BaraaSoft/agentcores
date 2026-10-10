import type { ModifierKey } from './modifier-key';

/**
 * A key press in driver-neutral form, e.g. Command+Shift+T is `{ key: 't', modifiers: ['meta', 'shift'] }`.
 *
 * `key` is either a single character (`'a'`, `'/'`) or a named key:
 * `enter`, `tab`, `escape`, `backspace`, `delete`, `space`, `up`, `down`, `left`, `right`,
 * `home`, `end`, `pageup`, `pagedown`, `insert`, `capslock`, `f1`–`f24`, or a modifier name on its own.
 */
export interface KeyCombo {
  readonly key: string;
  readonly modifiers: readonly ModifierKey[];
}
