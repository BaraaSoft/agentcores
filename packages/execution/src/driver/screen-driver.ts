import type { CapturedImage } from './types/captured-image';
import type { Region } from './types/region';

/**
 * Reads pixels off the display. Implementations wrap an OS tool or library
 * (e.g. macOS `screencapture`) so the rest of the package never imports one directly.
 */
export interface ScreenDriver {
  /**
   * Captures the main display, or only `region` when given, at the display's native resolution.
   * `region` is in the same display pixels the PointerDriver uses; on a Retina Mac the image comes back 2x larger.
   */
  capture(region?: Region): Promise<CapturedImage>;
}
