/**
 * Lifecycle of an escalation.
 * - `open`: waiting on the owner.
 * - `approved`: the owner said go; the Task is re-queued.
 * - `rejected`: the owner said no; the Task is marked failed.
 */
export const ESCALATION_STATUSES = ['open', 'approved', 'rejected'] as const;

export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];
