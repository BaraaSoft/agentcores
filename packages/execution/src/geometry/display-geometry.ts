import type { Point } from '../driver/types/point';
import type { Region } from '../driver/types/region';
import type { Size } from '../driver/types/size';

/**
 * Converts between the two pixel spaces of a task:
 * - display pixels — what the PointerDriver moves in (macOS logical points),
 * - screenshot pixels — what the model sees and clicks in.
 *
 * Retina doesn't matter here: captures are resized straight to `screenshotSize`,
 * whatever their native resolution. One instance is fixed for a whole task,
 * because the model's coordinates are only meaningful while the screenshot size stays the same.
 */
export class DisplayGeometry {
  private constructor(
    readonly displaySize: Size,
    readonly screenshotSize: Size,
  ) {}

  /**
   * Picks the largest screenshot size that keeps the display's aspect ratio and fits
   * inside `maxScreenshotSize`. Never scales up past the display size.
   */
  static fit(displaySize: Size, maxScreenshotSize: Size): DisplayGeometry {
    const scale = Math.min(
      1,
      maxScreenshotSize.width / displaySize.width,
      maxScreenshotSize.height / displaySize.height,
    );
    return new DisplayGeometry(displaySize, {
      width: Math.round(displaySize.width * scale),
      height: Math.round(displaySize.height * scale),
    });
  }

  /** True when `point` (screenshot pixels) lies on the screenshot. */
  isInsideScreenshot(point: Point): boolean {
    return (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.y >= 0 &&
      point.x < this.screenshotSize.width &&
      point.y < this.screenshotSize.height
    );
  }

  /** Screenshot pixels → display pixels, for acting on a point the model chose. */
  toDisplay(point: Point): Point {
    return {
      x: Math.floor((point.x * this.displaySize.width) / this.screenshotSize.width),
      y: Math.floor((point.y * this.displaySize.height) / this.screenshotSize.height),
    };
  }

  /** Display pixels → screenshot pixels, for reporting the cursor back to the model. */
  toScreenshot(point: Point): Point {
    const x = Math.floor((point.x * this.screenshotSize.width) / this.displaySize.width);
    const y = Math.floor((point.y * this.screenshotSize.height) / this.displaySize.height);
    return {
      x: Math.min(Math.max(x, 0), this.screenshotSize.width - 1),
      y: Math.min(Math.max(y, 0), this.screenshotSize.height - 1),
    };
  }

  /**
   * Turns two opposite corners in screenshot pixels (in any order) into a display region.
   * The region is at least 1×1 so a degenerate zoom still captures something.
   */
  regionToDisplay(cornerA: Point, cornerB: Point): Region {
    const topLeft = this.toDisplay({ x: Math.min(cornerA.x, cornerB.x), y: Math.min(cornerA.y, cornerB.y) });
    const bottomRight = this.toDisplay({ x: Math.max(cornerA.x, cornerB.x), y: Math.max(cornerA.y, cornerB.y) });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(1, bottomRight.x - topLeft.x),
      height: Math.max(1, bottomRight.y - topLeft.y),
    };
  }
}
