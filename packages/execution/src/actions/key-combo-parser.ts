import type { KeyCombo } from '../driver/types/key-combo';
import type { ModifierKey } from '../driver/types/modifier-key';
import { ActionRefusedError } from './action-refused.error';
import { KEY_ALIASES, MODIFIER_ALIASES } from './key-names.constants';

const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-9]|2[0-4])$/;

/**
 * Reads the model's `+`-joined key strings (`"Return"`, `"cmd+shift+t"`, `"ctrl++"`)
 * into driver-neutral KeyCombos. Unknown names are refused rather than guessed.
 */
export class KeyComboParser {
  /** Parses one key combination: zero or more modifiers followed by exactly one key. */
  static parse(text: string): KeyCombo {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new ActionRefusedError('The key combination is empty.');
    }
    if (/\s/.test(trimmed)) {
      throw new ActionRefusedError(`"${trimmed}" looks like several keys. Send one key combination per call.`);
    }

    const { keyToken, modifierPart } = KeyComboParser.splitKeyToken(trimmed);
    const modifiers = KeyComboParser.parseModifiers(modifierPart);
    const modifierOnly = MODIFIER_ALIASES[KeyComboParser.normalize(keyToken)];
    const key = modifierOnly ?? KeyComboParser.parseKey(keyToken);

    return { key, modifiers };
  }

  /** Parses a modifier-only string such as `"ctrl+shift"`. `null` or `""` means no modifiers. */
  static parseModifiers(text: string | null): readonly ModifierKey[] {
    if (text === null || text.trim().length === 0) {
      return [];
    }
    const modifiers = text.split('+').map((token) => {
      const modifier = MODIFIER_ALIASES[KeyComboParser.normalize(token)];
      if (modifier === undefined) {
        throw new ActionRefusedError(`"${token.trim()}" is not a modifier key. Use shift, ctrl, alt, or super.`);
      }
      return modifier;
    });
    return [...new Set(modifiers)];
  }

  /** Separates the final key from the modifiers before it, treating a trailing `++` as the `+` key. */
  private static splitKeyToken(text: string): { keyToken: string; modifierPart: string } {
    if (text === '+') {
      return { keyToken: '+', modifierPart: '' };
    }
    if (text.endsWith('++')) {
      return { keyToken: '+', modifierPart: text.slice(0, -2) };
    }
    const separator = text.lastIndexOf('+');
    return separator === -1
      ? { keyToken: text, modifierPart: '' }
      : { keyToken: text.slice(separator + 1), modifierPart: text.slice(0, separator) };
  }

  /** Resolves a single non-modifier key: a literal character, a named key, or an F-key. */
  private static parseKey(token: string): string {
    const raw = token.trim();
    if ([...raw].length === 1) {
      return raw;
    }
    const normalized = KeyComboParser.normalize(raw);
    const named = KEY_ALIASES[normalized];
    if (named !== undefined) {
      return named;
    }
    if (FUNCTION_KEY_PATTERN.test(normalized)) {
      return normalized;
    }
    throw new ActionRefusedError(`"${raw}" is not a key this desktop knows.`);
  }

  /** Lower-cases a key name and drops `_`, `-` and spaces, so `Page_Down` and `pagedown` match. */
  private static normalize(name: string): string {
    return name.trim().toLowerCase().replace(/[_\-\s]/g, '');
  }
}
