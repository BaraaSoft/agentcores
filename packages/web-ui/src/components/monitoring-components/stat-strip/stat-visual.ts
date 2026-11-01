/**
 * The small picture beside a metric: a `ring` that fills with a ratio, `steps` with one dot per step
 * (finished, current, and to come), or a `meter` of ten bars for a score.
 */
export type StatVisual =
  | { readonly kind: 'ring'; readonly ratio: number }
  | { readonly kind: 'steps'; readonly done: number; readonly total: number; readonly currentLive: boolean }
  | { readonly kind: 'meter'; readonly value: number | null; readonly max: number }
  | { readonly kind: 'pulse'; readonly active: boolean };
