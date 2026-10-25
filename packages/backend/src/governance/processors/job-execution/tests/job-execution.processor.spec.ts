import type { TaskStatus } from '@ahe/agent-core';
import type { Job, Queue } from 'bullmq';
import type { MemoryRetrievalService } from '../../../../memory/memory-retrieval.service';
import type { JobExecutionJobData } from '../../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../../queue/types/task-execution-job-data';
import type { JobReasoningService } from '../../../../reasoning/job/job-reasoning.service';
import type { JobPlan } from '../../../../reasoning/job/types/job-plan';
import type { WorkflowService } from '../../../../workflow/workflow.service';
import type { JobService } from '../../../services/job.service';
import type { TaskService } from '../../../services/task.service';
import {
  MAX_CONSECUTIVE_FAILURES,
  MAX_REVIEWING_ATTEMPTS,
  MAX_TASKS_ADDED_PER_REVIEW,
  MAX_TASKS_PER_JOB,
} from '../job-execution.constants';
import { JobExecutionProcessor } from '../job-execution.processor';

const WORKFLOW_ID = 'wf-1';
const JOB_ID = 'job-1';
const ACTIONS = ['Open r/AICompanion', 'Reply to the top thread'];

function plan(changes: Partial<JobPlan> = {}): JobPlan {
  return { rationale: 'Go.', remainingActions: ACTIONS, isObjectiveMet: false, abandonReason: null, summary: 'So far so good.', ...changes };
}

function task(sequence: number, status: TaskStatus, action = `Task ${sequence}`) {
  return { id: `task-${sequence}`, sequence, action, status, result: null, failureReason: status === 'failed' ? 'Page not found' : null };
}

function setup() {
  const taskQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const jobReasoning = { planTasks: jest.fn().mockResolvedValue(plan()) };
  const workflows = { findWorkflowById: jest.fn().mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'running' }) };
  const jobs = {
    findJobById: jest.fn().mockResolvedValue({
      id: JOB_ID,
      name: 'Engage r/AICompanion',
      objective: 'Join the conversation on r/AICompanion',
      unitOfWork: { name: 'Community engagement' },
      outcomeStatus: null,
    }),
    closeJob: jest.fn().mockResolvedValue(true),
    recordReviewingAttempt: jest.fn().mockResolvedValue(1),
    resetReviewingAttempts: jest.fn().mockResolvedValue(undefined),
  };
  const tasks = {
    hasTasks: jest.fn().mockResolvedValue(false),
    listTasks: jest.fn().mockResolvedValue([]),
    findUnreviewedTask: jest.fn().mockResolvedValue(null),
    replaceRemainingTasks: jest.fn().mockResolvedValue([]),
    markTaskReviewed: jest.fn().mockResolvedValue(true),
    findNextPendingTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
  };
  const memory = {
    retrieveSafeContext: jest.fn().mockResolvedValue({ owner: 'owner-1', records: [], promptBlock: 'Voice: warm, short.' }),
  };

  const processor = new JobExecutionProcessor(
    taskQueue as unknown as Queue<TaskExecutionJobData>,
    jobReasoning as unknown as JobReasoningService,
    workflows as unknown as WorkflowService,
    jobs as unknown as JobService,
    tasks as unknown as TaskService,
    memory as unknown as MemoryRetrievalService,
  );
  const run = () => processor.process({ data: { workflowId: WORKFLOW_ID, jobId: JOB_ID } } as Job<JobExecutionJobData>);

  /** A Job whose Tasks are `existing`, with the last finished one awaiting review. */
  const reviewing = (existing: ReturnType<typeof task>[]) => {
    const finished = existing.filter((each) => each.status === 'complete' || each.status === 'failed');
    tasks.hasTasks.mockResolvedValue(true);
    tasks.listTasks.mockResolvedValue(existing);
    tasks.findUnreviewedTask.mockResolvedValue(finished.at(-1) ?? null);
  };

  return { run, reviewing, taskQueue, jobReasoning, workflows, jobs, tasks, memory };
}

describe('JobExecutionProcessor', () => {
  it('plans a new Job with safe context, then queues its first Task', async () => {
    const t = setup();

    await t.run();

    expect(t.jobReasoning.planTasks).toHaveBeenCalledWith({
      jobName: 'Engage r/AICompanion',
      objective: 'Join the conversation on r/AICompanion',
      unitName: 'Community engagement',
      safeContext: 'Voice: warm, short.',
      outcomes: [],
      remainingActions: [],
    });
    expect(t.tasks.replaceRemainingTasks).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, jobId: JOB_ID, actions: ACTIONS });
    expect(t.tasks.markTaskReviewed).not.toHaveBeenCalled();
    expect(t.taskQueue.add).toHaveBeenCalledWith('task-1', { workflowId: WORKFLOW_ID, taskId: 'task-1' });
  });

  it('reviews a finished Task with the outcomes and remaining plan, then marks it reviewed', async () => {
    const t = setup();
    t.reviewing([task(1, 'complete', 'Open r/AICompanion'), task(2, 'pending', 'Reply to the top thread')]);

    await t.run();

    expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        outcomes: [{ action: 'Open r/AICompanion', status: 'complete', result: null, failureReason: null }],
        remainingActions: ['Reply to the top thread'],
      }),
    );
    expect(t.tasks.replaceRemainingTasks).toHaveBeenCalled();
    expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    expect(t.taskQueue.add).toHaveBeenCalledTimes(1);
  });

  it('only queues the current Task when nothing awaits review', async () => {
    const t = setup();
    t.tasks.hasTasks.mockResolvedValue(true);

    await t.run();

    expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).toHaveBeenCalledTimes(1);
  });

  it('queues nothing while a Task of the Job is still in progress', async () => {
    const t = setup();
    t.tasks.hasTasks.mockResolvedValue(true);
    t.tasks.findNextPendingTask.mockResolvedValue(null);

    await t.run();

    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('closes the Job as success when the objective is met', async () => {
    const t = setup();
    t.reviewing([task(1, 'complete'), task(2, 'pending')]);
    t.jobReasoning.planTasks.mockResolvedValue(plan({ isObjectiveMet: true, remainingActions: [], summary: 'Target reached.' }));

    await t.run();

    expect(t.jobs.closeJob).toHaveBeenCalledWith({ jobId: JOB_ID, status: 'success', summary: 'Target reached.' });
    expect(t.tasks.replaceRemainingTasks).not.toHaveBeenCalled();
    expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('closes the Job as abandoned when Job reasoning decides to stop', async () => {
    const t = setup();
    t.reviewing([task(1, 'complete'), task(2, 'pending')]);
    t.jobReasoning.planTasks.mockResolvedValue(plan({ abandonReason: 'The community is inactive.' }));

    await t.run();

    expect(t.jobs.closeJob).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'abandoned', summary: expect.stringContaining('The community is inactive.') }),
    );
  });

  it(`closes the Job as failed after ${MAX_CONSECUTIVE_FAILURES} failed Tasks in a row, whatever the plan`, async () => {
    const t = setup();
    t.reviewing([task(1, 'complete'), ...[2, 3, 4].map((sequence) => task(sequence, 'failed')), task(5, 'pending')]);

    await t.run();

    expect(t.jobs.closeJob).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('keeps going after fewer failures in a row', async () => {
    const t = setup();
    t.reviewing([task(1, 'failed'), task(2, 'complete'), task(3, 'failed')]);

    await t.run();

    expect(t.jobs.closeJob).not.toHaveBeenCalled();
    expect(t.tasks.replaceRemainingTasks).toHaveBeenCalled();
  });

  it('closes the Job as failed when the plan is empty without the objective met', async () => {
    const t = setup();
    t.jobReasoning.planTasks.mockResolvedValue(plan({ remainingActions: [] }));

    await t.run();

    expect(t.jobs.closeJob).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', summary: expect.stringContaining('No Tasks left') }),
    );
  });

  it(`caps what one review adds to ${MAX_TASKS_ADDED_PER_REVIEW} Tasks beyond the remaining plan`, async () => {
    const t = setup();
    t.reviewing([task(1, 'complete'), task(2, 'pending')]);
    const ballooned = Array.from({ length: 12 }, (_, index) => `New ${index}`);
    t.jobReasoning.planTasks.mockResolvedValue(plan({ remainingActions: ballooned }));

    await t.run();

    const { actions } = t.tasks.replaceRemainingTasks.mock.calls[0][0];
    expect(actions).toEqual(ballooned.slice(0, 1 + MAX_TASKS_ADDED_PER_REVIEW));
  });

  it(`closes the Job as failed once it has started ${MAX_TASKS_PER_JOB} Tasks without meeting its objective`, async () => {
    const t = setup();
    t.reviewing(Array.from({ length: MAX_TASKS_PER_JOB }, (_, index) => task(index + 1, 'complete')));

    await t.run();

    expect(t.jobs.closeJob).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', summary: expect.stringContaining(`${MAX_TASKS_PER_JOB}-Task limit`) }),
    );
  });

  it('resets the attempt count once a plan is applied', async () => {
    const t = setup();

    await t.run();

    expect(t.jobs.recordReviewingAttempt).toHaveBeenCalledWith(JOB_ID);
    expect(t.jobs.resetReviewingAttempts).toHaveBeenCalledWith(JOB_ID);
  });

  it('keeps the attempt count when Job reasoning throws, so the queue retry counts it', async () => {
    const t = setup();
    t.jobReasoning.planTasks.mockRejectedValue(new Error('Opus overloaded'));

    await expect(t.run()).rejects.toThrow('Opus overloaded');
    expect(t.jobs.resetReviewingAttempts).not.toHaveBeenCalled();
    expect(t.tasks.markTaskReviewed).not.toHaveBeenCalled();
  });

  it(`closes the Job as failed after ${MAX_REVIEWING_ATTEMPTS} failed attempts, without calling Job reasoning`, async () => {
    const t = setup();
    t.reviewing([task(1, 'complete'), task(2, 'pending')]);
    t.jobs.recordReviewingAttempt.mockResolvedValue(MAX_REVIEWING_ATTEMPTS + 1);

    await t.run();

    expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
    expect(t.jobs.closeJob).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', summary: expect.stringContaining(`${MAX_REVIEWING_ATTEMPTS} times`) }),
    );
    expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('does nothing once the Job is closed', async () => {
    const t = setup();
    t.jobs.findJobById.mockResolvedValue({ id: JOB_ID, outcomeStatus: 'success' });

    await t.run();

    expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('does nothing while the Workflow is paused', async () => {
    const t = setup();
    t.workflows.findWorkflowById.mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'paused' });

    await t.run();

    expect(t.jobs.findJobById).not.toHaveBeenCalled();
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });
});
