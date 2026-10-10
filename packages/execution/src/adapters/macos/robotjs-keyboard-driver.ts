import * as robot from 'robotjs';
import type { KeyboardDriver } from '../../driver/keyboard-driver';
import type { KeyCombo } from '../../driver/types/key-combo';
import { sleep } from '../../utils/sleep';
import type { MacosClipboard } from './macos-clipboard';

const ROBOTJS_KEY_NAMES: Readonly<Record<string, string>> = { meta: 'command' };
const PASTE_SETTLE_MILLISECONDS = 150;

/**
 * KeyboardDriver backed by robotjs, with a clipboard fallback for text robotjs can't type.
 *
 * robotjs on macOS truncates characters above U+FFFF (most emoji) to 16 bits, so any text
 * containing one is pasted with Command+V instead; the previous clipboard text is restored afterwards.
 * Newlines and tabs are sent as real Return/Tab presses so every app treats them the same way.
 */
export class RobotjsKeyboardDriver implements KeyboardDriver {
  constructor(private readonly clipboard: MacosClipboard) {}

  async typeText(text: string): Promise<void> {
    if (this.hasCharacterOutsideBmp(text)) {
      await this.pasteText(text);
      return;
    }
    for (const segment of text.split(/(\r\n|\n|\t)/)) {
      if (segment === '\n' || segment === '\r\n') {
        robot.keyTap('enter');
      } else if (segment === '\t') {
        robot.keyTap('tab');
      } else if (segment.length > 0) {
        robot.typeString(segment);
      }
    }
  }

  async tap(combo: KeyCombo): Promise<void> {
    robot.keyTap(this.toRobotjsKey(combo.key), combo.modifiers.map((modifier) => this.toRobotjsKey(modifier)));
  }

  async keyDown(key: string): Promise<void> {
    robot.keyToggle(this.toRobotjsKey(key), 'down');
  }

  async keyUp(key: string): Promise<void> {
    robot.keyToggle(this.toRobotjsKey(key), 'up');
  }

  /** Puts `text` on the clipboard, pastes it, then puts the old clipboard text back. */
  private async pasteText(text: string): Promise<void> {
    const previous = await this.clipboard.read();
    await this.clipboard.write(text);
    try {
      robot.keyTap('v', 'command');
      await sleep(PASTE_SETTLE_MILLISECONDS);
    } finally {
      await this.clipboard.write(previous);
    }
  }

  private hasCharacterOutsideBmp(text: string): boolean {
    return [...text].some((character) => (character.codePointAt(0) ?? 0) > 0xffff);
  }

  private toRobotjsKey(key: string): string {
    return ROBOTJS_KEY_NAMES[key] ?? key;
  }
}
