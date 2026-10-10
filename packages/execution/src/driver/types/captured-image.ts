/**
 * An encoded image of (part of) the display. Never leaves the execution package.
 */
export interface CapturedImage {
  readonly data: Buffer;
  readonly mediaType: 'image/png';
}
