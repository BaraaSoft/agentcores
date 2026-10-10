/**
 * The owner's answer to an escalation.
 */
export interface ResolveEscalationInput {
  readonly escalationId: string;
  readonly isApproved: boolean;
  readonly ownerNote: string | null;
}
