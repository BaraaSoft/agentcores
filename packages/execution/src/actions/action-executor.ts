import type { ToolCall } from '@agentcores/agent-core';
import type { DesktopDriver } from '../driver/desktop-driver';
import type { Point } from '../driver/types/point';
import type { DisplayGeometry } from '../geometry/display-geometry';
import { sleep } from '../utils/sleep';
import {
  MAX_HOLD_KEY_MILLISECONDS,
  MAX_KEY_REPEAT,
  MAX_SCROLL_AMOUNT,
  MAX_TYPE_LENGTH,
  MAX_WAIT_MILLISECONDS,
} from './action-limits.constants';
import type { ActionOutcome } from './action-outcome';
import { ActionRefusedError } from './action-refused.error';
import { KeyComboParser } from './key-combo-parser';

/**
 * Carries out ToolCalls on the desktop. This is where the model's intent meets the machine:
 * it checks every model-supplied value, converts screenshot pixels to display pixels,
 * holds modifiers around clicks, and resizes captures to the task's screenshot size.
 *
 * It knows nothing about any model provider — only ToolCall in, ActionOutcome out.
 */
export class ActionExecutor {
  /**
   * @param desktop the machine, behind our driver facade
   * @param geometry the pixel spaces for this task; fixed until the task ends
   * @param settleDelayMs pause after each input action so the UI can react before the next screenshot
   */
  constructor(
    private readonly desktop: DesktopDriver,
    private readonly geometry: DisplayGeometry,
    private readonly settleDelayMs: number,
  ) {}

  /**
   * Performs one ToolCall. Throws ActionRefusedError for input the desktop won't honor;
   * any other error means the desktop itself failed.
   */
  async perform(toolCall: ToolCall, signal?: AbortSignal | null): Promise<ActionOutcome> {
    switch (toolCall.kind) {
      case 'screenshot':
        return this.captureScreenshot();
      case 'zoom':
        return this.captureZoom(toolCall.from, toolCall.to);
      case 'cursorPosition':
        return { kind: 'cursor', position: this.geometry.toScreenshot(await this.desktop.pointer.getPosition()) };
      case 'wait':
        await sleep(this.checkRange(toolCall.milliseconds, 0, MAX_WAIT_MILLISECONDS, 'wait'), signal);
        return { kind: 'done' };
      default:
        await this.performInput(toolCall, signal);
        await sleep(this.settleDelayMs, signal);
        return { kind: 'done' };
    }
  }

  /** Runs the actions that send mouse or keyboard input. */
  private async performInput(toolCall: ToolCall, signal?: AbortSignal | null): Promise<void> {
    const { pointer, keyboard } = this.desktop;

    switch (toolCall.kind) {
      case 'click': {
        if (toolCall.clickCount > pointer.maxClickCount) {
          throw new ActionRefusedError(`This desktop supports at most ${pointer.maxClickCount} clicks at once.`);
        }
        const modifiers = KeyComboParser.parseModifiers(toolCall.modifiers);
        await this.moveIfGiven(toolCall.at);
        await this.withKeysHeld(modifiers, () => pointer.click(toolCall.button, toolCall.clickCount));
        return;
      }
      case 'drag': {
        const modifiers = KeyComboParser.parseModifiers(toolCall.modifiers);
        const from = this.toDisplay(toolCall.from);
        const to = this.toDisplay(toolCall.to);
        await this.withKeysHeld(modifiers, async () => {
          await pointer.moveTo(from);
          await pointer.press('left');
          try {
            await pointer.moveTo(to);
          } finally {
            await pointer.release('left');
          }
        });
        return;
      }
      case 'mouseMove':
        await pointer.moveTo(this.toDisplay(toolCall.to));
        return;
      case 'mouseDown':
        await pointer.press('left');
        return;
      case 'mouseUp':
        await pointer.release('left');
        return;
      case 'scroll': {
        const amount = this.checkRange(toolCall.amount, 1, MAX_SCROLL_AMOUNT, 'scroll_amount');
        const modifiers = KeyComboParser.parseModifiers(toolCall.modifiers);
        await this.moveIfGiven(toolCall.at);
        await this.withKeysHeld(modifiers, () => pointer.scroll(toolCall.direction, amount));
        return;
      }
      case 'type':
        if (toolCall.text.length > MAX_TYPE_LENGTH) {
          throw new ActionRefusedError(`Type at most ${MAX_TYPE_LENGTH} characters per call.`);
        }
        await keyboard.typeText(toolCall.text);
        return;
      case 'key': {
        const combo = KeyComboParser.parse(toolCall.combo);
        const repeat = this.checkRange(toolCall.repeat, 1, MAX_KEY_REPEAT, 'repeat');
        for (let press = 0; press < repeat; press++) {
          await keyboard.tap(combo);
        }
        return;
      }
      case 'holdKey': {
        const combo = KeyComboParser.parse(toolCall.combo);
        const milliseconds = this.checkRange(toolCall.milliseconds, 0, MAX_HOLD_KEY_MILLISECONDS, 'duration');
        await this.withKeysHeld([...combo.modifiers, combo.key], () => sleep(milliseconds, signal));
        return;
      }
      default:
        throw new ActionRefusedError(`"${toolCall.kind}" is not an input action.`);
    }
  }

  /** Captures the full display at the task's fixed screenshot size. */
  private async captureScreenshot(): Promise<ActionOutcome> {
    const capture = await this.desktop.screen.capture();
    return { kind: 'image', image: await this.desktop.images.resize(capture, this.geometry.screenshotSize) };
  }

  /** Captures one region at native resolution, scaled up or down to fill the usual screenshot size. */
  private async captureZoom(from: Point, to: Point): Promise<ActionOutcome> {
    this.checkOnScreen(from);
    this.checkOnScreen(to);
    const capture = await this.desktop.screen.capture(this.geometry.regionToDisplay(from, to));
    return { kind: 'image', image: await this.desktop.images.scaleToFit(capture, this.geometry.screenshotSize) };
  }

  /** Moves the cursor to `point` when the model gave one; `null` means act at the cursor. */
  private async moveIfGiven(point: Point | null): Promise<void> {
    if (point !== null) {
      await this.desktop.pointer.moveTo(this.toDisplay(point));
    }
  }

  /** Presses `keys` in order, runs `action`, then releases them in reverse order. */
  private async withKeysHeld(keys: readonly string[], action: () => Promise<void>): Promise<void> {
    const { keyboard } = this.desktop;
    const pressed: string[] = [];
    try {
      for (const key of keys) {
        await keyboard.keyDown(key);
        pressed.push(key);
      }
      await action();
    } finally {
      for (const key of pressed.reverse()) {
        await keyboard.keyUp(key);
      }
    }
  }

  /** Checks a model point is on the screenshot, then converts it to display pixels. */
  private toDisplay(point: Point): Point {
    this.checkOnScreen(point);
    return this.geometry.toDisplay(point);
  }

  private checkOnScreen(point: Point): void {
    if (!this.geometry.isInsideScreenshot(point)) {
      const { width, height } = this.geometry.screenshotSize;
      throw new ActionRefusedError(`[${point.x}, ${point.y}] is outside the ${width}x${height} screenshot.`);
    }
  }

  /** Returns `value` if it is a number within [min, max]; refuses it otherwise. */
  private checkRange(value: number, min: number, max: number, field: string): number {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new ActionRefusedError(`${field} must be between ${min} and ${max}; got ${value}.`);
    }
    return value;
  }
}
