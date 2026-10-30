import type { JobOrderType } from './job-order-type';
import type { JobOutcomeStatus } from './job-outcome-status';
import type { Task } from './task';

/**
 * A collection of related Tasks with one clear objective,
 * always tagged to a Unit of Work. Open while `outcomeStatus` is null.
 */
export interface Job {
  readonly id: string;
  readonly unitOfWorkId: string;
  readonly name: string;
  readonly objective: string;
  readonly orderType: JobOrderType;
  /** Position among the Unit's ordered Jobs, from 1; null for an unordered Job. */
  readonly orderNumber: number | null;
  readonly tasks: readonly Task[];
  readonly outcomeStatus: JobOutcomeStatus | null;
  /** What was achieved, or why the Job stopped. */
  readonly outcomeSummary: string | null;
}
