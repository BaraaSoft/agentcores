import type { UnitOfWorkProgress } from './unit-of-work-progress';

/** The response of `GET /workflows/:id/progress`: the Strategy and all of its work so far. */
export interface WorkflowProgress {
  readonly workflowId: string;
  readonly workflowState: 'running' | 'paused';
  readonly strategy: {
    readonly id: string;
    readonly name: string;
    readonly objective: string;
    readonly workType: 'continuous' | 'one_off' | 'multi_version';
    readonly versionCount: number | null;
    readonly maxAttempts: number;
    readonly status: string;
  };
  readonly unitsOfWork: readonly UnitOfWorkProgress[];
}
