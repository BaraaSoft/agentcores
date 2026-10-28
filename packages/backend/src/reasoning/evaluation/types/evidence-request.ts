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
  /** Why this evidence decides the score. */
  readonly rubric: string;
}
