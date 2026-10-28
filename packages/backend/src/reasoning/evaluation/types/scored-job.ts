/**
 * A settled judgement of one Job: a mark out of 10 and the feedback the next planner will read.
 */
export interface ScoredJob {
  readonly verdict: 'scored';
  /** 1–10 against the objective. */
  readonly score: number;
  /** The objective in general terms, so a future Job with a similar aim finds this one. */
  readonly objectiveSummary: string;
  /** What worked, written as advice to whoever plans the next Job like this. */
  readonly whatGood: string;
  /** What went wrong and should not be repeated, in the same voice. */
  readonly whatBad: string;
  /** The standard the Job was held to, and where the evidence came from. */
  readonly rubric: string;
}
