/**
 * The reasoning layer's verdict on a step: is the whole Task done, and what to remember.
 */
export interface OutcomeEvaluation {
  readonly isTaskComplete: boolean;
  readonly shouldRetry: boolean;
  readonly summary: string;
}
