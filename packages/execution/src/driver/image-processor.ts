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

  /**
   * Scales the image up or down, keeping its aspect ratio, to the largest size that fits inside `box`.
   * Used for zoom, whose small crops are enlarged so fine details become legible to the model.
   */
  scaleToFit(image: CapturedImage, box: Size): Promise<CapturedImage>;
}
