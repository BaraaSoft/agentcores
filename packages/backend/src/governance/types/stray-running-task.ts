import type { JobOutcomeStatus, UnitOfWorkState, WorkflowState } from '@ahe/agent-core';

/**
 * A `running` Task whose work is not running: its Job is closed, its Unit of Work or Workflow is not
 * running, it names another Workflow than its Unit, or it has run for too long. Logged to help debugging.
 */
export interface StrayRunningTask {
  readonly taskId: string;
  readonly action: string;
  readonly startedAt: Date | null;
  /** The Workflow the Task row names. */
  readonly taskWorkflowId: string;
  readonly jobId: string;
  readonly jobName: string;
  readonly jobOutcome: JobOutcomeStatus | null;
  readonly unitOfWorkId: string;
  readonly unitOfWorkName: string;
  readonly unitOfWorkState: UnitOfWorkState;
  /** The Workflow the Task's Unit of Work belongs to. */
  readonly workflowId: string;
  readonly workflowState: WorkflowState;
  /** The last change of the Workflow, such as its pause. */
  readonly workflowUpdatedAt: Date;
}
