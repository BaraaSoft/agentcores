/**
 * Whether a Job waits for the Jobs before it in its Unit of Work.
 * - `ordered`: runs only after every ordered Job with a lower `orderNumber` has closed as `success`.
 * - `unordered`: runs whenever there is capacity.
 */
export const JOB_ORDER_TYPES = ['ordered', 'unordered'] as const;

export type JobOrderType = (typeof JOB_ORDER_TYPES)[number];
