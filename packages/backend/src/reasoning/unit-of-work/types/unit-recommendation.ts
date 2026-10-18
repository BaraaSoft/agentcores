/**
 * What a Unit review recommends for the Unit's share of effort in the next cycle.
 * - `grow`: it's working; give it more.
 * - `keep`: on track; leave it as is.
 * - `shrink`: weak but promising; give it less.
 * - `deprecate`: not working; stop it.
 */
export const UNIT_RECOMMENDATIONS = ['grow', 'keep', 'shrink', 'deprecate'] as const;

export type UnitRecommendation = (typeof UNIT_RECOMMENDATIONS)[number];
