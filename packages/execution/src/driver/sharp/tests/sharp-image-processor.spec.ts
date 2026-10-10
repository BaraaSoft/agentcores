import sharp from 'sharp';
import type { CapturedImage } from '../../types/captured-image';
import { SharpImageProcessor } from '../sharp-image-processor';

const blankImage = async (width: number, height: number): Promise<CapturedImage> => ({
  data: await sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).png().toBuffer(),
  mediaType: 'image/png',
});

describe('SharpImageProcessor', () => {
  const images = new SharpImageProcessor();

  it('resizes to exactly the given size', async () => {
    const resized = await images.resize(await blankImage(2880, 1800), { width: 1280, height: 800 });
    expect(await images.getSize(resized)).toEqual({ width: 1280, height: 800 });
  });

  it('scales a small zoom crop up to fill the box, keeping its aspect ratio', async () => {
    const scaled = await images.scaleToFit(await blankImage(360, 90), { width: 1280, height: 800 });
    expect(await images.getSize(scaled)).toEqual({ width: 1280, height: 320 });
  });

  it('scales a large zoom crop down to fit the box', async () => {
    const scaled = await images.scaleToFit(await blankImage(2000, 2000), { width: 1280, height: 800 });
    expect(await images.getSize(scaled)).toEqual({ width: 800, height: 800 });
  });
});
