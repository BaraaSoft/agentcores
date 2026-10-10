import type { ImageProcessor } from './image-processor';
import type { KeyboardDriver } from './keyboard-driver';
import type { PointerDriver } from './pointer-driver';
import type { ScreenDriver } from './screen-driver';
import type { DesktopPermissions } from './types/desktop-permissions';

/**
 * Everything the execution layer needs from the machine, behind our own interfaces.
 * Swapping robotjs, `screencapture`, or sharp for something else means writing a new
 * adapter for one of these parts — nothing above this facade changes.
 */
export interface DesktopDriver {
  readonly screen: ScreenDriver;
  readonly pointer: PointerDriver;
  readonly keyboard: KeyboardDriver;
  readonly images: ImageProcessor;

  /** Reports whether the OS currently lets this process capture the screen and send input. */
  checkPermissions(): Promise<DesktopPermissions>;
}
