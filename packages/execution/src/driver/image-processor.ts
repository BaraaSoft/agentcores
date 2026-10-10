import type { CapturedImage } from './types/captured-image';
import type { Size } from './types/size';

/**
 * Resizes captured images so they fit the model's image limits.
 * Implementations wrap an image library (e.g. sharp).
 */
export interface ImageProcessor {
  /** Pixel size of an encoded image. */
  getSize(image: CapturedImage): Promise<Size>;

  /** Scales the image to exactly `size`. Used for full screenshots, whose size must never change mid-task. */
  resize(image: CapturedImage, size: Size): Promise<CapturedImage>;

  /** Scales the image down, keeping its aspect ratio, until it fits inside `box`. Never scales up. */
  fitWithin(image: CapturedImage, box: Size): Promise<CapturedImage>;
}
