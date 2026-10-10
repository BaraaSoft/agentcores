import sharp from 'sharp';
import type { ImageProcessor } from '../image-processor';
import type { CapturedImage } from '../types/captured-image';
import type { Size } from '../types/size';

/**
 * ImageProcessor backed by sharp (libvips). Cross-platform, so it isn't tied to the macOS drivers.
 */
export class SharpImageProcessor implements ImageProcessor {
  async getSize(image: CapturedImage): Promise<Size> {
    const { width, height } = await sharp(image.data).metadata();
    return { width, height };
  }

  async resize(image: CapturedImage, size: Size): Promise<CapturedImage> {
    const data = await sharp(image.data).resize(size.width, size.height, { fit: 'fill' }).png().toBuffer();
    return { data, mediaType: 'image/png' };
  }

  async scaleToFit(image: CapturedImage, box: Size): Promise<CapturedImage> {
    const data = await sharp(image.data).resize(box.width, box.height, { fit: 'inside' }).png().toBuffer();
    return { data, mediaType: 'image/png' };
  }
}
