import type { JobProgress } from './job-progress';

/** One Unit of Work of a Strategy, with its Jobs. */
export interface UnitOfWorkProgress {
  readonly id: string;
  readonly sequence: number;
  readonly name: string;
  readonly title: string;
  readonly rationale: string;
  readonly status: 'open' | 'evaluating' | 'complete';
  readonly evaluateAfter: string | null;
  readonly createdAt: string;
  readonly jobs: readonly JobProgress[];
}
