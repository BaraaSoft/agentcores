/**
 * The Job cannot be judged from what is on record, and the missing part is behind the owner's own
 * login — the engagement on their post, a file they saved — so searching the web cannot reach it. The
 * evaluator asks for a Job that reads it on their machine, then judges again.
 */
export interface EvidenceRequest {
  readonly verdict: 'needs_evidence';
  readonly evidenceJobName: string;
  /** What the evidence Job must find out, concrete enough for a computer-use agent to carry out. */
  readonly evidenceObjective: string;
  /** Why this evidence decides the score. */
  readonly rubric: string;
}
