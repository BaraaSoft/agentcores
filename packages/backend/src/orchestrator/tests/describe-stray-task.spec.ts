import type { StrayRunningTask } from '../../governance/types/stray-running-task';
import { describeStrayTask } from '../describe-stray-task';
import { PAUSE_STEP_GRACE_MS, STUCK_TASK_MS } from '../orchestrator.constants';

const NOW = new Date('2026-11-02T10:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

const TASK: StrayRunningTask = {
  taskId: 'task-1',
  action: 'Post the draft',
  startedAt: minutesAgo(2),
  taskWorkflowId: 'wf-1',
  jobId: 'job-1',
  jobName: 'Post',
  jobOutcome: null,
  unitOfWorkId: 'unit-1',
  unitOfWorkName: 'Attempt 1',
  unitOfWorkState: 'paused',
  workflowId: 'wf-1',
  workflowState: 'paused',
  workflowUpdatedAt: minutesAgo(1),
};

describe('describeStrayTask', () => {
  it('only warns while a just-paused run ends its current step, with every id to find it', () => {
    expect(describeStrayTask(TASK, NOW)).toEqual({
      level: 'warn',
      line:
        '[stray-task] Task task-1 "Post the draft" is running, but its Workflow is paused; its Unit of Work is paused. ' +
        'It should stop before its next step (paused 1 min ago). Job job-1 "Post", Unit of Work unit-1 "Attempt 1", Workflow wf-1.',
    });
  });

  it('logs an error once the paused run has had its grace time', () => {
    const late = { ...TASK, workflowUpdatedAt: new Date(NOW.getTime() - PAUSE_STEP_GRACE_MS - 60_000) };

    expect(describeStrayTask(late, NOW).level).toBe('error');
  });

  it.each([
    [
      'a closed Job',
      { jobOutcome: 'abandoned' as const, workflowState: 'running' as const, unitOfWorkState: 'running' as const },
      'its Job is closed (abandoned)',
    ],
    ['a done run', { workflowState: 'done' as const }, 'its Workflow is done'],
    ['another Workflow on the Task', { taskWorkflowId: 'wf-9' }, "it names Workflow wf-9, not its Unit's Workflow"],
    ['no start time', { startedAt: null }, 'it has no start time'],
  ])('logs an error for %s', (_label, changes, reason) => {
    const log = describeStrayTask({ ...TASK, ...changes }, NOW);

    expect(log.level).toBe('error');
    expect(log.line).toContain(reason);
  });

  it('logs a Task of a running Job that has run too long, as the worker may have stopped', () => {
    const stuck = {
      ...TASK,
      unitOfWorkState: 'running' as const,
      workflowState: 'running' as const,
      startedAt: new Date(NOW.getTime() - STUCK_TASK_MS - 5 * 60_000),
    };

    expect(describeStrayTask(stuck, NOW)).toMatchObject({
      level: 'error',
      line: expect.stringContaining('is running, but it has run for 35 min, so the worker may have stopped.'),
    });
  });
});
