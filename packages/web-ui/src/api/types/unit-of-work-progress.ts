import type { JobProgress } from './job-progress';

/** One Unit of Work of a Strategy, with its Jobs. */
export interface UnitOfWorkProgress {
  readonly id: string;
  readonly sequence: number;
  readonly name: string;
  readonly title: string;
  readonly rationale: string;
  readonly status: 'open' | 'evaluating' | 'complete';
  /** Whether its Jobs may run. `paused` while the run is paused; a running Task still ends its current step. */
  readonly state: 'running' | 'paused';
  readonly evaluateAfter: string | null;
  readonly createdAt: string;
  readonly jobs: readonly JobProgress[];
}
