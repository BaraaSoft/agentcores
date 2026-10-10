/**
 * A rectangle on the display, in display pixels: top-left corner plus size.
 */
export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
