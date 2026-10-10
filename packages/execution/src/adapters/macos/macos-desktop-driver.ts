import * as robot from 'robotjs';
import type { DesktopDriver } from '../../driver/desktop-driver';
import type { DesktopPermissions } from '../../driver/types/desktop-permissions';
import { SharpImageProcessor } from '../sharp/sharp-image-processor';
import { MacosClipboard } from './macos-clipboard';
import { RobotjsKeyboardDriver } from './robotjs-keyboard-driver';
import { RobotjsPointerDriver } from './robotjs-pointer-driver';
import { ScreencaptureScreenDriver } from './screencapture-screen-driver';

const DEFAULT_SCROLL_PIXELS_PER_CLICK = 50;

/**
 * The Mac Mini's desktop: `screencapture` for pixels, robotjs for mouse and keyboard, sharp for resizing.
 * This is the only place that chooses concrete libraries; to swap one, change the part it builds.
 */
export class MacosDesktopDriver implements DesktopDriver {
  readonly screen = new ScreencaptureScreenDriver();
  readonly pointer: RobotjsPointerDriver;
  readonly keyboard = new RobotjsKeyboardDriver(new MacosClipboard());
  readonly images = new SharpImageProcessor();

  constructor(scrollPixelsPerClick: number = DEFAULT_SCROLL_PIXELS_PER_CLICK) {
    this.pointer = new RobotjsPointerDriver(scrollPixelsPerClick);
  }

  /** Reads the Accessibility and Screen Recording grants without prompting. */
  async checkPermissions(): Promise<DesktopPermissions> {
    return {
      canControlInput: robot.getAccessibilityPermission() !== false,
      canCaptureScreen: robot.getScreenCapturePermission() !== false,
    };
  }

  /**
   * Shows the macOS permission prompts for anything not yet granted. Run once by hand
   * on a new machine (see `check:desktop`); never during a task, since nobody is there to click.
   */
  async requestPermissions(): Promise<DesktopPermissions> {
    return {
      canControlInput: robot.requestAccessibilityPermission() !== false,
      canCaptureScreen: robot.requestScreenCapturePermission() !== false,
    };
  }
}
