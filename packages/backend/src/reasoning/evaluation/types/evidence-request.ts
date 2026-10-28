import type { EvidenceCriterion } from './evidence-criterion';

/**
 * The Job cannot be judged from what is on record, and the missing part is the work itself: the
 * engagement on a post, a file that was exported, a project sitting in an editor. No search reaches
 * any of those, so the evaluator asks for a Job that opens it on the owner's machine and reports back
 * on the specific things the mark turns on, then judges again on what came back.
 */
export interface EvidenceRequest {
  readonly verdict: 'needs_evidence';
  readonly evidenceJobName: string;
  /** What the evidence Job must find out, concrete enough for a computer-use agent to carry out. */
  readonly evidenceObjective: string;
  /**
   * What to rate once the work is open, when the mark turns on the quality of something that has to
   * be seen. Empty when the errand is only going to read a figure off a page. Each criterion comes
   * back as a metric reading under its key, so the evaluator gets numbers rather than prose.
   */
  readonly evidenceCriteria: readonly EvidenceCriterion[];
  /** Why this evidence decides the score. */
  readonly rubric: string;
}
