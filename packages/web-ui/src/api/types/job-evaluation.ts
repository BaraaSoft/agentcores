/** The judgement of a Job: its state, its score out of 10, and the feedback. */
export interface JobEvaluation {
  readonly state: 'evaluating' | 'awaiting_evidence' | 'scored' | 'failed';
  readonly score: number | null;
  readonly whatGood: string;
  readonly whatBad: string;
  readonly rubric: string;
}
