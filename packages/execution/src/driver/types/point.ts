/**
 * A position in pixels from the top-left corner. Which pixel space it is in
 * (display or screenshot) is always stated by whoever holds it.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}
