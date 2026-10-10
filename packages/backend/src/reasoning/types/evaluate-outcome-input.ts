/**
 * The result of one executed step, for the reasoning layer to judge.
 */
export interface EvaluateOutcomeInput {
  readonly taskAction: string;
  readonly instruction: string;
  readonly executionSummary: string;
  readonly isExecutionSuccess: boolean;
}
