import type { DesktopDriver } from '../desktop-driver';
import type { ImageProcessor } from '../image-processor';
import type { KeyboardDriver } from '../keyboard-driver';
import type { PointerDriver } from '../pointer-driver';
import type { ScreenDriver } from '../screen-driver';
import type { CapturedImage } from '../types/captured-image';
import type { DesktopPermissions } from '../types/desktop-permissions';
import type { KeyCombo } from '../types/key-combo';
import type { MouseButton } from '../types/mouse-button';
import type { Point } from '../types/point';
import type { Region } from '../types/region';
import type { ScrollDirection } from '../types/scroll-direction';
import type { Size } from '../types/size';

/**
 * An in-memory desktop for tests. Every driver call is appended to `calls` as a readable string,
 * e.g. `"moveTo 720,450"`, so a test can assert the exact sequence of OS actions.
 */
export class FakeDesktopDriver implements DesktopDriver {
  readonly calls: string[] = [];
  permissions: DesktopPermissions = { canControlInput: true, canCaptureScreen: true };
  cursor: Point = { x: 0, y: 0 };

  readonly screen: ScreenDriver;
  readonly pointer: PointerDriver;
  readonly keyboard: KeyboardDriver;
  readonly images: ImageProcessor;

  constructor(displaySize: Size = { width: 1440, height: 900 }, maxClickCount = 2) {
    const calls = this.calls;
    const image = (label: string): CapturedImage => ({ data: Buffer.from(label), mediaType: 'image/png' });

    this.screen = {
      capture: async (region?: Region) => {
        calls.push(region ? `capture ${region.x},${region.y} ${region.width}x${region.height}` : 'capture');
        return image('capture');
      },
    };

    this.pointer = {
      maxClickCount,
      getDisplaySize: async () => displaySize,
      getPosition: async () => this.cursor,
      moveTo: async (point: Point) => {
        this.cursor = point;
        calls.push(`moveTo ${point.x},${point.y}`);
      },
      click: async (button: MouseButton, clickCount: number) => {
        calls.push(`click ${button} x${clickCount}`);
      },
      press: async (button: MouseButton) => {
        calls.push(`press ${button}`);
      },
      release: async (button: MouseButton) => {
        calls.push(`release ${button}`);
      },
      scroll: async (direction: ScrollDirection, clicks: number) => {
        calls.push(`scroll ${direction} ${clicks}`);
      },
    };

    this.keyboard = {
      typeText: async (text: string) => {
        calls.push(`type ${text}`);
      },
      tap: async (combo: KeyCombo) => {
        calls.push(`tap ${[...combo.modifiers, combo.key].join('+')}`);
      },
      keyDown: async (key: string) => {
        calls.push(`keyDown ${key}`);
      },
      keyUp: async (key: string) => {
        calls.push(`keyUp ${key}`);
      },
    };

    this.images = {
      getSize: async () => displaySize,
      resize: async (_image: CapturedImage, size: Size) => {
        calls.push(`resize ${size.width}x${size.height}`);
        return image(`resized ${size.width}x${size.height}`);
      },
      scaleToFit: async (_image: CapturedImage, box: Size) => {
        calls.push(`scaleToFit ${box.width}x${box.height}`);
        return image(`scaled ${box.width}x${box.height}`);
      },
    };
  }

  async checkPermissions(): Promise<DesktopPermissions> {
    return this.permissions;
  }
}
