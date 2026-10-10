import type { CapturedImage } from '../driver/types/captured-image';
import type { Point } from '../driver/types/point';

/**
 * What performing one ToolCall produced: nothing (a pure action), an image
 * (`screenshot`, `zoom`), or the cursor position in screenshot pixels (`cursorPosition`).
 */
export type ActionOutcome =
  | { readonly kind: 'done' }
  | { readonly kind: 'image'; readonly image: CapturedImage }
  | { readonly kind: 'cursor'; readonly position: Point };
