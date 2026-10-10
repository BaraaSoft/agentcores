import type { KeyCombo } from './types/key-combo';

/**
 * Sends keyboard input to whatever window has focus.
 * Key names are the driver-neutral ones documented on KeyCombo.
 */
export interface KeyboardDriver {
  /** Types `text` as if a person typed it, including newlines and any Unicode (emoji, accents). */
  typeText(text: string): Promise<void>;

  /** Presses and releases one key combination, e.g. Command+C. */
  tap(combo: KeyCombo): Promise<void>;

  /** Presses and holds one key (a modifier or a regular key) until `keyUp`. */
  keyDown(key: string): Promise<void>;

  /** Releases a key held by `keyDown`. */
  keyUp(key: string): Promise<void>;
}
