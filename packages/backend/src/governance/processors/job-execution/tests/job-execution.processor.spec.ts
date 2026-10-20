import type { Job, Queue } from 'bullmq';
import type { MemoryRetrievalService } from '../../../../memory/memory-retrieval.service';
import type { JobExecutionJobData } from '../../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../../queue/types/task-execution-job-data';
import type { JobReasoningService } from '../../../../reasoning/job/job-reasoning.service';
import type { WorkflowService } from '../../../../workflow/workflow.service';
import type { JobService } from '../../../services/job.service';
import type { TaskService } from '../../../services/task.service';
import { JobExecutionProcessor } from '../job-execution.processor';

const WORKFLOW_ID = 'wf-1';
const JOB_ID = 'job-1';
const ACTIONS = ['Open r/AICompanion', 'Reply to the top thread'];

function setup() {
  const taskQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const jobReasoning = { breakDownJob: jest.fn().mockResolvedValue({ actions: ACTIONS }) };
  const workflows = { findWorkflowById: jest.fn().mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'running' }) };
  const jobs = {
    findJobById: jest.fn().mockResolvedValue({
      id: JOB_ID,
      name: 'Engage r/AICompanion',
      objective: 'Join the conversation on r/AICompanion',
      unitOfWork: { name: 'Community engagement' },
    }),
  };
  const tasks = {
    hasTasks: jest.fn().mockResolvedValue(false),
    createTasks: jest.fn().mockResolvedValue([]),
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

  return { run, taskQueue, jobReasoning, workflows, jobs, tasks, memory };
}

describe('JobExecutionProcessor', () => {
  it('breaks a new Job into Tasks with safe context, then queues its first Task', async () => {
    const t = setup();

    await t.run();

    expect(t.jobReasoning.breakDownJob).toHaveBeenCalledWith({
      jobName: 'Engage r/AICompanion',
      objective: 'Join the conversation on r/AICompanion',
      unitName: 'Community engagement',
      safeContext: 'Voice: warm, short.',
    });
    expect(t.tasks.createTasks).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, jobId: JOB_ID, actions: ACTIONS });
    expect(t.taskQueue.add).toHaveBeenCalledWith('task-1', { workflowId: WORKFLOW_ID, taskId: 'task-1' });
  });

  it('does not break a Job down twice when it is queued again', async () => {
    const t = setup();
    t.tasks.hasTasks.mockResolvedValue(true);

    await t.run();

    expect(t.jobReasoning.breakDownJob).not.toHaveBeenCalled();
    expect(t.tasks.createTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).toHaveBeenCalledTimes(1);
  });

  it('queues nothing while a Task of the Job is still in progress', async () => {
    const t = setup();
    t.tasks.hasTasks.mockResolvedValue(true);
    t.tasks.findNextPendingTask.mockResolvedValue(null);

    await t.run();

    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('does nothing while the Workflow is paused', async () => {
    const t = setup();
    t.workflows.findWorkflowById.mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'paused' });

    await t.run();

    expect(t.tasks.hasTasks).not.toHaveBeenCalled();
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });
});
