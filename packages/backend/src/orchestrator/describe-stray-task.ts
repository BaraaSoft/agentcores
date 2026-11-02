import type { StrayRunningTask } from '../governance/types/stray-running-task';
import { PAUSE_STEP_GRACE_MS, STUCK_TASK_MS } from './orchestrator.constants';

/** One log line for a stray running Task, and how loud it is. */
export interface StrayTaskLog {
  /** `warn` while a paused run ends its current step, which is normal for a short time; `error` otherwise. */
  readonly level: 'warn' | 'error';
  readonly line: string;
}

const minutes = (ms: number): string => `${Math.round(ms / 60_000)} min`;
const ageOf = (date: Date | null, now: Date): number | null => (date === null ? null : now.getTime() - new Date(date).getTime());

/**
 * Says why a `running` Task does not belong to running work, with every id needed to find it. A Task of a
 * paused run that ends its current step within `PAUSE_STEP_GRACE_MS` of the pause is only a warning.
 */
export function describeStrayTask(task: StrayRunningTask, now: Date): StrayTaskLog {
  const age = ageOf(task.startedAt, now);
  const isStuck = age === null || age > STUCK_TASK_MS;
  const isOtherWorkflow = task.taskWorkflowId !== task.workflowId;
  const sincePause = ageOf(task.workflowUpdatedAt, now) ?? 0;

  const reasons: string[] = [];
  if (task.jobOutcome !== null) reasons.push(`its Job is closed (${task.jobOutcome})`);
  if (task.workflowState !== 'running') reasons.push(`its Workflow is ${task.workflowState}`);
  if (task.unitOfWorkState !== 'running') reasons.push(`its Unit of Work is ${task.unitOfWorkState}`);
  if (isOtherWorkflow) reasons.push(`it names Workflow ${task.taskWorkflowId}, not its Unit's Workflow`);
  if (age === null) reasons.push('it has no start time');
  else if (isStuck) reasons.push(`it has run for ${minutes(age)}, so the worker may have stopped`);

  const isEndingStep =
    task.workflowState === 'paused' && task.jobOutcome === null && !isOtherWorkflow && !isStuck && sincePause <= PAUSE_STEP_GRACE_MS;
  const note = isEndingStep ? ` It should stop before its next step (paused ${minutes(sincePause)} ago).` : '';
  return {
    level: isEndingStep ? 'warn' : 'error',
    line:
      `[stray-task] Task ${task.taskId} "${task.action}" is running, but ${reasons.join('; ')}.${note} ` +
      `Job ${task.jobId} "${task.jobName}", Unit of Work ${task.unitOfWorkId} "${task.unitOfWorkName}", ` +
      `Workflow ${task.workflowId}.`,
  };
}
