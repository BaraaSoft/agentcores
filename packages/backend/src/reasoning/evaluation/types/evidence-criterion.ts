/**
 * One thing the evidence Job must look at and rate, named precisely enough that whoever opens the
 * work knows where to look. The evaluator writes these from what it learnt about how this kind of
 * work is done well, so the criteria carry the standard down to the agent that can actually see the
 * artifact.
 */
export interface EvidenceCriterion {
  /** The key the reading comes back under, e.g. `title_legibility`. */
  readonly key: string;
  /** What to examine, concretely: what to look at, and what would make it good. */
  readonly whatToExamine: string;
}
