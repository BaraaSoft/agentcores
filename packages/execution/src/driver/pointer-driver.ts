import type { MouseButton } from './types/mouse-button';
import type { Point } from './types/point';
import type { ScrollDirection } from './types/scroll-direction';
import type { Size } from './types/size';

/**
 * Moves and clicks the mouse. All points are display pixels (macOS "points", not Retina pixels).
 * Implementations wrap an input library (e.g. robotjs) behind this interface.
 */
export interface PointerDriver {
  /** Highest click count `click` supports: 2 means double-click works but triple-click does not. */
  readonly maxClickCount: number;

  /** Size of the coordinate space the pointer moves in — the logical size of the main display. */
  getDisplaySize(): Promise<Size>;

  /** Where the cursor is now. */
  getPosition(): Promise<Point>;

  /** Moves the cursor. If a button is being held, the move is sent as a drag so apps see it. */
  moveTo(point: Point): Promise<void>;

  /** Clicks `button` at the cursor, `clickCount` times as one multi-click (2 = double-click). */
  click(button: MouseButton, clickCount: number): Promise<void>;

  /** Presses and holds `button` at the cursor until `release`. */
  press(button: MouseButton): Promise<void>;

  /** Releases a button held by `press`. */
  release(button: MouseButton): Promise<void>;

  /** Scrolls at the cursor by `clicks` notches of a scroll wheel. */
  scroll(direction: ScrollDirection, clicks: number): Promise<void>;
}
