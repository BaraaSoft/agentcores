/**
 * Mouse buttons a pointer driver can press.
 */
export const MOUSE_BUTTONS = ['left', 'right', 'middle'] as const;

export type MouseButton = (typeof MOUSE_BUTTONS)[number];
