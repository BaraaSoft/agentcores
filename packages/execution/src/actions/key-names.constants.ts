import type { ModifierKey } from '../driver/types/modifier-key';

/**
 * Every spelling of a modifier the model may use (xdotool, macOS, Windows), lower-cased with `_`, `-` and spaces removed.
 * `super` is the model's name for the Command key.
 */
export const MODIFIER_ALIASES: Readonly<Record<string, ModifierKey>> = {
  super: 'meta',
  superl: 'meta',
  superr: 'meta',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  metal: 'meta',
  metar: 'meta',
  win: 'meta',
  windows: 'meta',
  ctrl: 'control',
  control: 'control',
  controll: 'control',
  controlr: 'control',
  alt: 'alt',
  altl: 'alt',
  altr: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
  shiftl: 'shift',
  shiftr: 'shift',
};

/**
 * Every spelling of a named key the model may use, normalized like MODIFIER_ALIASES,
 * mapped to the neutral name documented on KeyCombo. F-keys are matched separately.
 */
export const KEY_ALIASES: Readonly<Record<string, string>> = {
  return: 'enter',
  enter: 'enter',
  kpenter: 'enter',
  tab: 'tab',
  escape: 'escape',
  esc: 'escape',
  backspace: 'backspace',
  delete: 'delete',
  del: 'delete',
  space: 'space',
  spacebar: 'space',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  home: 'home',
  end: 'end',
  pageup: 'pageup',
  prior: 'pageup',
  pagedown: 'pagedown',
  next: 'pagedown',
  insert: 'insert',
  capslock: 'capslock',
  plus: '+',
  minus: '-',
};
