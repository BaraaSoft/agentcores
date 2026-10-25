import type { TaskStatus } from '@ahe/agent-core';
import type { Job, Queue } from 'bullmq';
import type { MemoryRetrievalService } from '../../../../memory/memory-retrieval.service';
import type { JobExecutionJobData } from '../../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../../queue/types/task-execution-job-data';
import type { JobReasoningService } from '../../../../reasoning/job/job-reasoning.service';
import type { JobReview } from '../../../../reasoning/job/types/job-review';
import type { ReasoningTool } from '../../../../reasoning/types/reasoning-tool';
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

function review(changes: Partial<JobReview> = {}): JobReview {
  return { decision: 'continue', rationale: 'On track.', revisionNotes: null, summary: 'So far so good.', ...changes };
}

function task(sequence: number, status: TaskStatus, action = `Task ${sequence}`) {
  return {
    id: `task-${sequence}`,
    sequence,
    action,
    status,
    result: null,
    failureReason: status === 'failed' ? 'Page not found' : null,
  };
}

type ToolCall = [name: string, input: object];

/** A fake planner: runs the given tool calls against the real toolset, then finishes the plan. */
function planner(calls: ToolCall[] = []) {
  return async (_input: unknown, tools: readonly ReasoningTool[]) => {
    const run = (name: string, input: object) => tools.find((each) => each.name === name)!.run(input as never);
    for (const [name, input] of calls) run(name, input);
    run('finish_plan', { rationale: 'Done.' });
  };
}

function setup() {
  const taskQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const jobReasoning = {
    reviewJob: jest.fn().mockResolvedValue(review()),
    planTasks: jest.fn(
      planner([
        ['add_task', { action: 'Open r/AICompanion', position: null }],
        ['add_task', { action: 'Reply', position: null }],
      ]),
    ),
  };
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

  /** A Job whose Tasks are `existing`, with the last complete or failed one awaiting review. */
  const reviewing = (existing: ReturnType<typeof task>[]) => {
    const finished = existing.filter((each) => each.status === 'complete' || each.status === 'failed');
    tasks.listTasks.mockResolvedValue(existing);
    tasks.findUnreviewedTask.mockResolvedValue(finished.at(-1) ?? null);
  };
  const savedActions = () => tasks.replaceRemainingTasks.mock.calls[0]?.[0].actions;

  return { run, reviewing, savedActions, taskQueue, jobReasoning, workflows, jobs, tasks, memory };
}

describe('JobExecutionProcessor', () => {
  describe('a new Job', () => {
    it('plans it with the planning tools, saves the draft once, and queues its first Task', async () => {
      const t = setup();

      await t.run();

      expect(t.jobReasoning.reviewJob).not.toHaveBeenCalled();
      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'Engage r/AICompanion',
          safeContext: 'Voice: warm, short.',
          reason: expect.stringContaining('first plan'),
          history: [],
          remainingActions: [],
          maxTasks: MAX_TASKS_PER_JOB,
        }),
        expect.any(Array),
      );
      expect(t.tasks.replaceRemainingTasks).toHaveBeenCalledTimes(1);
      expect(t.savedActions()).toEqual(['Open r/AICompanion', 'Reply']);
      expect(t.tasks.markTaskReviewed).not.toHaveBeenCalled();
      expect(t.taskQueue.add).toHaveBeenCalledWith('task-1', { workflowId: WORKFLOW_ID, taskId: 'task-1' });
    });

    it('closes it as failed when planning leaves no Tasks', async () => {
      const t = setup();
      t.jobReasoning.planTasks.mockImplementation(planner());

      await t.run();

      expect(t.jobs.closeJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', summary: 'Planning left no Tasks to run.' }),
      );
      expect(t.tasks.replaceRemainingTasks).not.toHaveBeenCalled();
    });

    it('saves nothing when planning throws halfway', async () => {
      const t = setup();
      t.jobReasoning.planTasks.mockRejectedValue(new Error('Opus overloaded'));

      await expect(t.run()).rejects.toThrow('Opus overloaded');
      expect(t.tasks.replaceRemainingTasks).not.toHaveBeenCalled();
      expect(t.jobs.resetReviewingAttempts).not.toHaveBeenCalled();
    });
  });

  describe('reviewing a finished Task', () => {
    it('reviews the latest Task against the earlier ones and the remaining plan, then keeps the plan', async () => {
      const t = setup();
      t.reviewing([task(1, 'cancelled'), task(2, 'complete', 'Open r/AICompanion'), task(3, 'pending', 'Reply')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).toHaveBeenCalledWith(
        expect.objectContaining({
          latestOutcome: { action: 'Open r/AICompanion', status: 'complete', result: null, failureReason: null },
          history: [{ action: 'Task 1', status: 'cancelled', result: null, failureReason: null }],
          remainingActions: ['Reply'],
        }),
      );
      expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
      expect(t.tasks.replaceRemainingTasks).not.toHaveBeenCalled();
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-2');
      expect(t.taskQueue.add).toHaveBeenCalledTimes(1);
    });

    it('hands the revision notes to planning and saves the edited plan', async () => {
      const t = setup();
      t.reviewing([task(1, 'failed', 'Post the link'), task(2, 'pending', 'Reply')]);
      t.jobReasoning.reviewJob.mockResolvedValue(
        review({ decision: 'revise', revisionNotes: 'Links are banned; post text only.' }),
      );
      t.jobReasoning.planTasks.mockImplementation(planner([['add_task', { action: 'Post a text-only intro', position: 1 }]]));

      await t.run();

      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: expect.stringContaining('Links are banned; post text only.'),
          history: [expect.objectContaining({ action: 'Post the link', status: 'failed' })],
          remainingActions: ['Reply'],
          maxTasks: 1 + MAX_TASKS_ADDED_PER_REVIEW,
        }),
        expect.any(Array),
      );
      expect(t.savedActions()).toEqual(['Post a text-only intro', 'Reply']);
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    });

    it('leaves the Job open and idle when the review continues but nothing is left to run', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete')]);
      t.tasks.findNextPendingTask.mockResolvedValue(null);

      await t.run();

      expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
      expect(t.jobs.closeJob).not.toHaveBeenCalled();
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
      expect(t.taskQueue.add).not.toHaveBeenCalled();
    });

    it('closes the Job as success when the objective is met', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete'), task(2, 'pending')]);
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'met', summary: 'Target reached.' }));

      await t.run();

      expect(t.jobs.closeJob).toHaveBeenCalledWith({ jobId: JOB_ID, status: 'success', summary: 'Target reached.' });
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
      expect(t.taskQueue.add).not.toHaveBeenCalled();
    });

    it('closes the Job as abandoned when Job reasoning decides to stop', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete'), task(2, 'pending')]);
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'abandon', rationale: 'The community is inactive.' }));

      await t.run();

      expect(t.jobs.closeJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'abandoned', summary: expect.stringContaining('The community is inactive.') }),
      );
    });

    it(`closes the Job as failed after ${MAX_CONSECUTIVE_FAILURES} failed Tasks in a row, without asking Job reasoning`, async () => {
      const t = setup();
      t.reviewing([task(1, 'complete'), ...[2, 3, 4].map((sequence) => task(sequence, 'failed')), task(5, 'pending')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).not.toHaveBeenCalled();
      expect(t.jobs.closeJob).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
      expect(t.taskQueue.add).not.toHaveBeenCalled();
    });

    it('keeps going after fewer failures in a row', async () => {
      const t = setup();
      t.reviewing([task(1, 'failed'), task(2, 'complete'), task(3, 'failed'), task(4, 'pending')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).toHaveBeenCalled();
      expect(t.jobs.closeJob).not.toHaveBeenCalled();
    });

    it(`closes the Job as failed when a revision is needed but ${MAX_TASKS_PER_JOB} Tasks have already started`, async () => {
      const t = setup();
      t.reviewing(Array.from({ length: MAX_TASKS_PER_JOB }, (_, index) => task(index + 1, 'complete')));
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'revise', revisionNotes: 'One more.' }));

      await t.run();

      expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
      expect(t.jobs.closeJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', summary: expect.stringContaining(`${MAX_TASKS_PER_JOB}-Task limit`) }),
      );
    });
  });

  describe('reviewing attempts', () => {
    it('counts the attempt and resets it once the step succeeds', async () => {
      const t = setup();

      await t.run();

      expect(t.jobs.recordReviewingAttempt).toHaveBeenCalledWith(JOB_ID);
      expect(t.jobs.resetReviewingAttempts).toHaveBeenCalledWith(JOB_ID);
    });

    it('keeps the count when the review throws, so the queue retry counts it', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete'), task(2, 'pending')]);
      t.jobReasoning.reviewJob.mockRejectedValue(new Error('Opus overloaded'));

      await expect(t.run()).rejects.toThrow('Opus overloaded');
      expect(t.jobs.resetReviewingAttempts).not.toHaveBeenCalled();
      expect(t.tasks.markTaskReviewed).not.toHaveBeenCalled();
    });

    it(`closes the Job as failed after ${MAX_REVIEWING_ATTEMPTS} failed attempts, without calling Job reasoning`, async () => {
      const t = setup();
      t.reviewing([task(1, 'complete'), task(2, 'pending')]);
      t.jobs.recordReviewingAttempt.mockResolvedValue(MAX_REVIEWING_ATTEMPTS + 1);

      await t.run();

      expect(t.jobReasoning.reviewJob).not.toHaveBeenCalled();
      expect(t.jobs.closeJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', summary: expect.stringContaining(`${MAX_REVIEWING_ATTEMPTS} times`) }),
      );
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
      expect(t.taskQueue.add).not.toHaveBeenCalled();
    });
  });

  it('only queues the current Task when nothing awaits review', async () => {
    const t = setup();
    t.tasks.listTasks.mockResolvedValue([task(1, 'complete'), task(2, 'pending')]);

    await t.run();

    expect(t.jobReasoning.reviewJob).not.toHaveBeenCalled();
    expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).toHaveBeenCalledTimes(1);
  });

  it('queues nothing while a Task of the Job is still in progress', async () => {
    const t = setup();
    t.tasks.listTasks.mockResolvedValue([task(1, 'running')]);
    t.tasks.findNextPendingTask.mockResolvedValue(null);

    await t.run();

    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('does nothing once the Job is closed', async () => {
    const t = setup();
    t.jobs.findJobById.mockResolvedValue({ id: JOB_ID, outcomeStatus: 'success' });

    await t.run();

    expect(t.tasks.listTasks).not.toHaveBeenCalled();
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
