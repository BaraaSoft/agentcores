/**
 * Upper bounds on model-supplied values. A call over a limit is refused, never clamped:
 * moving a value into range would do something the model didn't ask for.
 */
export const MAX_WAIT_MILLISECONDS = 15_000;
export const MAX_HOLD_KEY_MILLISECONDS = 5_000;
export const MAX_KEY_REPEAT = 100;
export const MAX_SCROLL_AMOUNT = 25;
export const MAX_TYPE_LENGTH = 5_000;
