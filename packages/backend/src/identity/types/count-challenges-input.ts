/**
 * The window to count an account's recent challenges over.
 */
export interface CountChallengesInput {
  readonly workflowId: string;
  readonly platform: string;
  readonly since: Date;
}
