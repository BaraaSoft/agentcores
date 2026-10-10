import type { DesktopDriver } from '../driver/desktop-driver';
import type { ImageProcessor } from '../driver/image-processor';
import type { KeyboardDriver } from '../driver/keyboard-driver';
import type { PointerDriver } from '../driver/pointer-driver';
import type { ScreenDriver } from '../driver/screen-driver';
import type { CapturedImage } from '../driver/types/captured-image';
import type { DesktopPermissions } from '../driver/types/desktop-permissions';
import type { KeyCombo } from '../driver/types/key-combo';
import type { MouseButton } from '../driver/types/mouse-button';
import type { Point } from '../driver/types/point';
import type { Region } from '../driver/types/region';
import type { ScrollDirection } from '../driver/types/scroll-direction';
import type { Size } from '../driver/types/size';

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
      fitWithin: async (_image: CapturedImage, box: Size) => {
        calls.push(`fitWithin ${box.width}x${box.height}`);
        return image(`fitted ${box.width}x${box.height}`);
      },
    };
  }

  async checkPermissions(): Promise<DesktopPermissions> {
    return this.permissions;
  }
}
