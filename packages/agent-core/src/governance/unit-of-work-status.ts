/**
 * Where a Unit of Work is in its life. Only the orchestrator moves it, and only forwards.
 * - `open`: its Jobs are running. A Strategy has at most one open Unit.
 * - `evaluating`: every Job is closed; its Jobs are evaluated once `evaluateAfter` has passed.
 * - `complete`: every evaluation is settled, so the next Unit can learn from it.
 */
export const UNIT_OF_WORK_STATUSES = ['open', 'evaluating', 'complete'] as const;

export type UnitOfWorkStatus = (typeof UNIT_OF_WORK_STATUSES)[number];
