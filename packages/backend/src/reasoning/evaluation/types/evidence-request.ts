/**
 * The Job cannot be judged from what is on record: its real outcome lives out in the world and has
 * to be read first. The evaluator asks for a Job that goes and reads it, then judges again.
 */
export interface EvidenceRequest {
  readonly verdict: 'needs_evidence';
  readonly evidenceJobName: string;
  /** What the evidence Job must find out, concrete enough for a computer-use agent to carry out. */
  readonly evidenceObjective: string;
  /** Why this evidence decides the score. */
  readonly rubric: string;
}
