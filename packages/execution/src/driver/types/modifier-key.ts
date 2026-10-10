/**
 * Modifier keys in driver-neutral names. `meta` is Command on macOS and the Windows key elsewhere.
 */
export const MODIFIER_KEYS = ['meta', 'control', 'alt', 'shift'] as const;

export type ModifierKey = (typeof MODIFIER_KEYS)[number];
