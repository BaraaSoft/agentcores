import type { UnitOfWorkProgress } from './unit-of-work-progress';
import type { WorkflowState } from './workflow-state';

/** The response of `GET /workflows/:id/progress`: the Strategy and all the work of this run so far. */
export interface WorkflowProgress {
  readonly workflowId: string;
  readonly workflowState: WorkflowState;
  readonly strategy: {
    readonly id: string;
    readonly name: string;
    readonly objective: string;
    readonly workType: 'continuous' | 'one_off' | 'multi_version';
    readonly versionCount: number | null;
    readonly maxAttempts: number;
  };
  readonly unitsOfWork: readonly UnitOfWorkProgress[];
}
