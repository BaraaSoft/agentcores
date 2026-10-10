type Point = { readonly x: number; readonly y: number };

/**
 * One low-level action the execution layer performs on the machine.
 * This is the vocabulary of the computer-use loop: every model call resolves to one of these,
 * so the desktop code never depends on a model provider's wire format.
 *
 * - Coordinates are pixels in the screenshots the model sees, not display pixels.
 * - `at: null` means "where the cursor already is".
 * - `modifiers` and `combo` are `+`-joined key names as the model wrote them, e.g. `"ctrl+shift"`, `"cmd+c"`.
 */
export type ToolCall =
  | { readonly kind: 'screenshot' }
  | { readonly kind: 'zoom'; readonly from: Point; readonly to: Point }
  | {
      readonly kind: 'click';
      readonly at: Point | null;
      readonly button: 'left' | 'right' | 'middle';
      readonly clickCount: 1 | 2 | 3;
      readonly modifiers: string | null;
    }
  | { readonly kind: 'drag'; readonly from: Point; readonly to: Point; readonly modifiers: string | null }
  | { readonly kind: 'mouseMove'; readonly to: Point }
  | { readonly kind: 'mouseDown' }
  | { readonly kind: 'mouseUp' }
  | { readonly kind: 'cursorPosition' }
  | {
      readonly kind: 'scroll';
      readonly at: Point | null;
      readonly direction: 'up' | 'down' | 'left' | 'right';
      readonly amount: number;
      readonly modifiers: string | null;
    }
  | { readonly kind: 'type'; readonly text: string }
  | { readonly kind: 'key'; readonly combo: string; readonly repeat: number }
  | { readonly kind: 'holdKey'; readonly combo: string; readonly milliseconds: number }
  | { readonly kind: 'wait'; readonly milliseconds: number };
