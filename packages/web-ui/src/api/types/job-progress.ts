import type { JobEvaluation } from './job-evaluation';
import type { TaskProgress } from './task-progress';

/** One Job of a Unit of Work, with its Tasks and its evaluation. */
export interface JobProgress {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly orderType: 'ordered' | 'unordered';
  readonly orderNumber: number | null;
  readonly outcomeStatus: 'success' | 'abandoned' | 'failed' | null;
  readonly outcomeSummary: string | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly evaluation: JobEvaluation | null;
  readonly tasks: readonly TaskProgress[];
}
