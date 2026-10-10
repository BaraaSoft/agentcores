import * as robot from 'robotjs';
import type { PointerDriver } from '../pointer-driver';
import type { MouseButton } from '../types/mouse-button';
import type { Point } from '../types/point';
import type { ScrollDirection } from '../types/scroll-direction';
import type { Size } from '../types/size';

/**
 * PointerDriver backed by robotjs (native CoreGraphics events on macOS).
 * robotjs has no triple-click, so `maxClickCount` is 2 and the toolset turns triple-click off.
 */
export class RobotjsPointerDriver implements PointerDriver {
  readonly maxClickCount = 2;
  private readonly heldButtons = new Set<MouseButton>();

  /**
   * @param scrollPixelsPerClick how far one scroll-wheel notch moves; robotjs scrolls in pixels on macOS
   */
  constructor(private readonly scrollPixelsPerClick: number) {}

  async getDisplaySize(): Promise<Size> {
    return robot.getScreenSize();
  }

  async getPosition(): Promise<Point> {
    return robot.getMousePos();
  }

  async moveTo(point: Point): Promise<void> {
    if (this.heldButtons.has('left')) {
      robot.dragMouse(point.x, point.y);
    } else {
      robot.moveMouse(point.x, point.y);
    }
  }

  async click(button: MouseButton, clickCount: number): Promise<void> {
    if (clickCount < 1 || clickCount > this.maxClickCount) {
      throw new Error(`robotjs cannot send a ${clickCount}-click`);
    }
    robot.mouseClick(button, clickCount === 2);
  }

  async press(button: MouseButton): Promise<void> {
    robot.mouseToggle('down', button);
    this.heldButtons.add(button);
  }

  async release(button: MouseButton): Promise<void> {
    robot.mouseToggle('up', button);
    this.heldButtons.delete(button);
  }

  /** CoreGraphics wheel deltas: positive vertical scrolls up, positive horizontal scrolls left. */
  async scroll(direction: ScrollDirection, clicks: number): Promise<void> {
    const pixels = Math.round(clicks * this.scrollPixelsPerClick);
    switch (direction) {
      case 'up':
        robot.scrollMouse(0, pixels);
        return;
      case 'down':
        robot.scrollMouse(0, -pixels);
        return;
      case 'left':
        robot.scrollMouse(pixels, 0);
        return;
      case 'right':
        robot.scrollMouse(-pixels, 0);
        return;
    }
  }
}
