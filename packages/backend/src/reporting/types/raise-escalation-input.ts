/**
 * A decision to hand to the owner.
 */
export interface RaiseEscalationInput {
  readonly workflowId: string;
  readonly taskId: string | null;
  readonly question: string;
}
