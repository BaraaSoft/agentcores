import type { TaskStatus } from '@ahe/agent-core';
import type { Job, Queue } from 'bullmq';
import type { MemoryRetrievalService } from '../../../../memory/memory-retrieval.service';
import type { JobEvaluationJobData } from '../../../../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../../queue/types/task-execution-job-data';
import type { JobReasoningService } from '../../../../reasoning/job/job-reasoning.service';
import type { JobReview } from '../../../../reasoning/job/types/job-review';
import type { PlannedTask } from '../../../../reasoning/job/types/planned-task';
import type { JobEvaluationService } from '../../../services/job-evaluation.service';
import type { JobScreenshotService } from '../../../services/job-screenshot.service';
import type { JobService } from '../../../services/job.service';
import type { TaskService } from '../../../services/task.service';
import {
  MAX_CONSECUTIVE_FAILURES,
  MAX_REVIEWING_ATTEMPTS,
} from '../job-execution.constants';
import { MAX_TASKS_PER_JOB, TASK_BUDGET_PER_JOB } from '../../../../reasoning/job/job-reasoning.constants';
import { JobExecutionProcessor } from '../job-execution.processor';

const WORKFLOW_ID = 'wf-1';
const JOB_ID = 'job-1';

type ReviewFields = { decision: JobReview['decision']; rationale: string; revisionNotes: string; summary: string };

function review(changes: Partial<ReviewFields> = {}): JobReview {
  return { decision: 'continue', rationale: 'On track.', summary: 'So far so good.', ...changes } as JobReview;
}

function task(sequence: number, status: TaskStatus, action = `Task ${sequence}`) {
  return {
    id: `task-${sequence}`,
    sequence,
    action,
    skillType: 'general',
    status,
    result: null,
    failureReason: status === 'failed' ? 'Page not found' : null,
    locationPath: null,
    locationDetails: null,
  };
}

const plan = (...actions: string[]): PlannedTask[] => actions.map((action) => ({ action, skillType: 'general' }));

function setup() {
  const taskQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const evaluationQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const jobReasoning = {
    reviewJob: jest.fn().mockResolvedValue(review()),
    planTasks: jest.fn().mockResolvedValue(plan('Open r/AICompanion', 'Reply')),
  };
  const job = {
    id: JOB_ID,
    unitOfWorkId: 'unit-1',
    name: 'Engage r/AICompanion',
    objective: 'Join the conversation on r/AICompanion',
    unitOfWork: { name: 'Community engagement', state: 'running', strategy: { owner: 'owner-1' } },
    outcomeStatus: null,
  };
  const unitJobs = [
    { id: 'job-done', name: 'Find the subreddit', objective: 'Pick the right community', outcomeStatus: 'success' },
    job,
    { id: 'job-next', name: 'Report the replies', objective: 'Write up the replies the intro earned', outcomeStatus: null },
  ];
  const jobs = {
    findJobById: jest.fn().mockResolvedValue(job),
    listJobsInUnits: jest.fn().mockResolvedValue(unitJobs),
    closeJob: jest.fn().mockResolvedValue(true),
    recordReviewingAttempt: jest.fn().mockResolvedValue(1),
    resetReviewingAttempts: jest.fn().mockResolvedValue(undefined),
  };
  const tasks = {
    listTasks: jest.fn().mockResolvedValue([]),
    listTasksInJobs: jest.fn().mockResolvedValue([]),
    findUnreviewedTask: jest.fn().mockResolvedValue(null),
    replaceRemainingTasks: jest.fn().mockResolvedValue([]),
    markTaskReviewed: jest.fn().mockResolvedValue(true),
    findNextPendingTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
  };
  const evaluations = {
    findEvaluationAwaiting: jest.fn().mockResolvedValue(null),
    resumeFromEvidence: jest.fn().mockResolvedValue(true),
  };
  const memory = {
    retrieveSafeContext: jest.fn().mockResolvedValue({ owner: 'owner-1', records: [], promptBlock: 'Voice: warm, short.' }),
  };

  const screenshots = { findTaskScreenshot: jest.fn().mockResolvedValue(null) };

  const processor = new JobExecutionProcessor(
    taskQueue as unknown as Queue<TaskExecutionJobData>,
    evaluationQueue as unknown as Queue<JobEvaluationJobData>,
    jobReasoning as unknown as JobReasoningService,
    jobs as unknown as JobService,
    tasks as unknown as TaskService,
    evaluations as unknown as JobEvaluationService,
    memory as unknown as MemoryRetrievalService,
    screenshots as unknown as JobScreenshotService,
  );
  const run = () => processor.process({ data: { workflowId: WORKFLOW_ID, jobId: JOB_ID } } as Job<JobExecutionJobData>);

  /** A Job whose Tasks are `existing`, with the last complete or failed one awaiting review. */
  const reviewing = (existing: ReturnType<typeof task>[]) => {
    const finished = existing.filter((each) => each.status === 'complete' || each.status === 'failed');
    tasks.listTasks.mockResolvedValue(existing);
    tasks.findUnreviewedTask.mockResolvedValue(finished.at(-1) ?? null);
  };
  const savedActions = () =>
    tasks.replaceRemainingTasks.mock.calls[0]?.[0].tasks.map((each: PlannedTask) => each.action);

  return { run, reviewing, savedActions, taskQueue, evaluationQueue, jobReasoning, job, jobs, tasks, evaluations, memory, screenshots };
}

describe('JobExecutionProcessor', () => {
  describe('a new Job', () => {
    it('plans it, saves the plan once, and queues its first Task', async () => {
      const t = setup();

      await t.run();

      expect(t.jobReasoning.reviewJob).not.toHaveBeenCalled();
      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'Engage r/AICompanion',
          safeContext: 'Voice: warm, short.',
          reason: expect.stringContaining('first plan'),
          history: [],
          remainingTasks: [],
          tasksStarted: 0,
          latestScreenshot: null,
        }),
      );
      expect(t.tasks.replaceRemainingTasks).toHaveBeenCalledTimes(1);
      expect(t.savedActions()).toEqual(['Open r/AICompanion', 'Reply']);
      expect(t.tasks.markTaskReviewed).not.toHaveBeenCalled();
      expect(t.taskQueue.add).toHaveBeenCalledWith('task-1', { workflowId: WORKFLOW_ID, taskId: 'task-1' });
    });

    it("shows planning only the Unit's other open Jobs: not the Job itself, and not the closed ones", async () => {
      const t = setup();

      await t.run();

      expect(t.jobs.listJobsInUnits).toHaveBeenCalledWith(['unit-1']);
      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({ openSiblingJobs: [{ name: 'Report the replies', objective: 'Write up the replies the intro earned' }] }),
      );
    });

    it("shows planning the Unit's closed Jobs with only their complete Tasks", async () => {
      const t = setup();
      const found = { ...task(1, 'complete', 'Find r/AICompanion'), jobId: 'job-done', locationPath: 'reddit.com/r/AICompanion' };
      t.tasks.listTasksInJobs.mockResolvedValue([found, { ...task(2, 'failed'), jobId: 'job-done' }]);

      await t.run();

      expect(t.tasks.listTasksInJobs).toHaveBeenCalledWith(['job-done']);
      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          finishedSiblingJobs: [
            {
              name: 'Find the subreddit',
              outcomes: [expect.objectContaining({ action: 'Find r/AICompanion', locationPath: 'reddit.com/r/AICompanion' })],
            },
          ],
        }),
      );
    });

    it('closes it as failed when planning leaves no Tasks', async () => {
      const t = setup();
      t.jobReasoning.planTasks.mockResolvedValue([]);

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
    it('shows the review the final screen of the latest Task when it has one', async () => {
      const t = setup();
      const screenshot = { mediaType: 'image/png' as const, base64: 'iVBORw0KGgo=' };
      t.screenshots.findTaskScreenshot.mockResolvedValue(screenshot);
      t.reviewing([task(1, 'complete', 'Design the launch post'), task(2, 'pending', 'Export it')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).toHaveBeenCalledWith(expect.objectContaining({ latestScreenshot: screenshot }));
    });

    it.each([
      ['a revision', review({ decision: 'revise', revisionNotes: 'Make the headline larger.' }), [task(1, 'complete', 'Design the post')]],
      ['an empty plan', review(), [task(1, 'complete', 'Design the post')]],
    ])('shows planning the screenshot the review saw, after %s', async (_case, verdict, tasks) => {
      const t = setup();
      const screenshot = { mediaType: 'image/png' as const, base64: 'iVBORw0KGgo=' };
      t.screenshots.findTaskScreenshot.mockResolvedValue(screenshot);
      t.reviewing(tasks);
      t.jobReasoning.reviewJob.mockResolvedValue(verdict);

      await t.run();

      expect(t.screenshots.findTaskScreenshot).toHaveBeenCalledTimes(1);
      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(expect.objectContaining({ latestScreenshot: screenshot }));
    });

    it("shows the review the Unit's other open Jobs", async () => {
      const t = setup();
      t.reviewing([task(1, 'complete', 'Open r/AICompanion'), task(2, 'pending', 'Reply')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).toHaveBeenCalledWith(
        expect.objectContaining({ openSiblingJobs: [{ name: 'Report the replies', objective: 'Write up the replies the intro earned' }] }),
      );
    });

    it('reviews the latest Task against the earlier ones and the remaining plan, then keeps the plan', async () => {
      const t = setup();
      t.reviewing([task(1, 'cancelled'), task(2, 'complete', 'Open r/AICompanion'), task(3, 'pending', 'Reply')]);

      await t.run();

      expect(t.jobReasoning.reviewJob).toHaveBeenCalledWith(
        expect.objectContaining({
          latestOutcome: {
            action: 'Open r/AICompanion',
            status: 'complete',
            result: null,
            failureReason: null,
            locationPath: null,
            locationDetails: null,
          },
          history: [
            {
              action: 'Task 1',
              status: 'cancelled',
              result: null,
              failureReason: null,
              locationPath: null,
              locationDetails: null,
            },
          ],
          remainingActions: ['Reply'],
          latestScreenshot: null,
        }),
      );
      expect(t.screenshots.findTaskScreenshot).toHaveBeenCalledWith({ jobId: JOB_ID, taskId: 'task-2' });
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
      t.jobReasoning.planTasks.mockResolvedValue(plan('Post a text-only intro', 'Reply'));

      await t.run();

      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: expect.stringContaining('Links are banned; post text only.'),
          history: [expect.objectContaining({ action: 'Post the link', status: 'failed' })],
          remainingTasks: [{ action: 'Reply', skillType: 'general' }],
          tasksStarted: 1,
        }),
      );
      expect(t.savedActions()).toEqual(['Post a text-only intro', 'Reply']);
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    });

    it('plans again when the review continues but nothing is left to run, so the Job never sits idle', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete')]);
      t.jobReasoning.planTasks.mockResolvedValue(plan('Reply to the first comment'));

      await t.run();

      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(
        expect.objectContaining({ reason: expect.stringContaining('plan ran out'), remainingTasks: [] }),
      );
      expect(t.savedActions()).toEqual(['Reply to the first comment']);
      expect(t.jobs.closeJob).not.toHaveBeenCalled();
      expect(t.tasks.markTaskReviewed).toHaveBeenCalledWith('task-1');
    });

    it('closes the Job as failed when that replanning finds nothing more to do', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete')]);
      t.jobReasoning.planTasks.mockResolvedValue([]);

      await t.run();

      expect(t.jobs.closeJob).toHaveBeenCalledWith(expect.objectContaining({ jobId: JOB_ID, status: 'failed' }));
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

    it('hands a closing evidence Job back to the evaluation waiting on it', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete')]);
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'met', summary: '61 upvotes.' }));
      t.evaluations.findEvaluationAwaiting.mockResolvedValue({ id: 'eval-1' });

      await t.run();

      expect(t.evaluations.findEvaluationAwaiting).toHaveBeenCalledWith(JOB_ID);
      expect(t.evaluationQueue.add).toHaveBeenCalledWith('eval-1', {
        workflowId: WORKFLOW_ID,
        evaluationId: 'eval-1',
      });
    });

    it('queues no evaluation for an ordinary Job that closes', async () => {
      const t = setup();
      t.reviewing([task(1, 'complete')]);
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'met', summary: 'Target reached.' }));

      await t.run();

      expect(t.evaluationQueue.add).not.toHaveBeenCalled();
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

    it('keeps planning past the Task budget when the review asks for more, leaving the call to Job reasoning', async () => {
      const t = setup();
      t.reviewing(Array.from({ length: TASK_BUDGET_PER_JOB }, (_, index) => task(index + 1, 'complete')));
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'revise', revisionNotes: 'One more export pass.' }));
      t.jobReasoning.planTasks.mockResolvedValue(plan('Export at 4K'));

      await t.run();

      expect(t.jobReasoning.planTasks).toHaveBeenCalledWith(expect.objectContaining({ tasksStarted: TASK_BUDGET_PER_JOB }));
      expect(t.savedActions()).toEqual(['Export at 4K']);
      expect(t.jobs.closeJob).not.toHaveBeenCalled();
    });

    it(`closes a runaway Job as failed, saying it needs more Tasks, once ${MAX_TASKS_PER_JOB} have started`, async () => {
      const t = setup();
      t.reviewing(Array.from({ length: MAX_TASKS_PER_JOB }, (_, index) => task(index + 1, 'complete')));
      t.jobReasoning.reviewJob.mockResolvedValue(review({ decision: 'revise', revisionNotes: 'One more pass.' }));

      await t.run();

      expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
      expect(t.jobs.closeJob).toHaveBeenCalledWith({
        jobId: JOB_ID,
        status: 'failed',
        summary: `So far so good.\nNeeds more Tasks: started all ${MAX_TASKS_PER_JOB} Tasks a Job may run, and the objective is not met yet.`,
      });
      expect(t.taskQueue.add).not.toHaveBeenCalled();
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

  it("does nothing while the Job's Unit of Work is paused", async () => {
    const t = setup();
    t.jobs.findJobById.mockResolvedValue({ ...t.job, unitOfWork: { ...t.job.unitOfWork, state: 'paused' } });

    await t.run();

    expect(t.tasks.listTasks).not.toHaveBeenCalled();
    expect(t.jobReasoning.planTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });
});
