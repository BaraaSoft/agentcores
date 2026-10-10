/**
 * Directions the view can be scrolled. `down` reveals content further down the page.
 */
export const SCROLL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];
