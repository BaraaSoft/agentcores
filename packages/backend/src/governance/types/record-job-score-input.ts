/**
 * The settled judgement of a Job: its score and the feedback the next planner will read.
 */
export interface RecordJobScoreInput {
  readonly evaluationId: string;
  /** 1–10 against the objective. */
  readonly score: number;
  readonly objectiveSummary: string;
  readonly whatGood: string;
  readonly whatBad: string;
  readonly rubric: string;
}
