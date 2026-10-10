/**
 * Looks for an existing, non-deprecated Unit a proposed Job belongs to.
 */
export interface FindMatchingUnitInput {
  readonly strategyId: string;
  readonly unitName: string;
  readonly jobObjective: string;
}
