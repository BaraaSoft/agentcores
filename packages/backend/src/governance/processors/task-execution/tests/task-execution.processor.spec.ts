import type { AccountCredentials, ExecutionProvider, ExecutionResult } from '@ahe/agent-core';
import type { Job, Queue } from 'bullmq';
import type { IdentityService } from '../../../../identity/identity.service';
import type { MemoryRetrievalService } from '../../../../memory/memory-retrieval.service';
import type { PrivacyFilterService } from '../../../../memory/privacy-filter.service';
import type { TaskExecutionJobData } from '../../../../queue/types/task-execution-job-data';
import type { TaskReasoningService } from '../../../../reasoning/task/task-reasoning.service';
import type { BlockerDecision } from '../../../../reasoning/task/types/blocker-decision';
import type { PlannedStep } from '../../../../reasoning/task/types/planned-step';
import type { TaskReasoningInput } from '../../../../reasoning/task/types/task-reasoning-input';
import type { ReportingService } from '../../../../reporting/reporting.service';
import type { WorkflowService } from '../../../../workflow/workflow.service';
import type { TaskEntity } from '../../../entities/task.entity';
import type { MetricsService } from '../../../services/metrics.service';
import type { TaskService } from '../../../services/task.service';
import { MAX_TASK_ITERATIONS } from '../task-execution.constants';
import { TaskExecutionProcessor } from '../task-execution.processor';

const WORKFLOW_ID = 'wf-1';
const TASK_ID = 'task-1';
const CREDENTIALS: AccountCredentials = { platform: 'reddit.com', username: 'ahe-bot', password: 'hunter2-secret' };

function step(overrides: Partial<PlannedStep> = {}): PlannedStep {
  return {
    instruction: 'Open reddit.com/r/AICompanion and read the top post',
    rationale: 'Need the thread before replying',
    platform: null,
    needsHumanJudgment: false,
    isTaskDone: false,
    ...overrides,
  };
}

function result(overrides: Partial<ExecutionResult> = {}): ExecutionResult {
  return {
    status: 'done',
    summary: 'The top post is about memory in AI companions.',
    finalLocation: 'Safari — reddit.com/r/AICompanion',
    blocker: null,
    stepsTaken: 4,
    metricReadings: {},
    ...overrides,
  };
}

function decision(overrides: Partial<BlockerDecision> = {}): BlockerDecision {
  return { rationale: 'Rate limited', nextStep: null, retryAfterMinutes: null, ownerRequest: null, learning: null, ...overrides };
}

function setup() {
  const task = {
    id: TASK_ID,
    jobId: 'job-1',
    status: 'pending',
    action: 'Reply to the top thread on r/AICompanion',
    job: { objective: 'Engage with r/AICompanion', unitOfWorkId: 'unit-1' },
  } as unknown as TaskEntity;

  const execution = { runTask: jest.fn<Promise<ExecutionResult>, Parameters<ExecutionProvider['runTask']>>() };
  const taskQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const reasoning = {
    planNextStep: jest.fn<Promise<PlannedStep>, [TaskReasoningInput]>(),
    decideOnBlocker: jest.fn<Promise<BlockerDecision>, [TaskReasoningInput]>(),
  };
  const workflows = { findWorkflowById: jest.fn().mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'running' }) };
  const tasks = {
    findTaskWithLineage: jest.fn().mockResolvedValue(task),
    findNextPendingTask: jest.fn().mockResolvedValue(null),
    markTaskRunning: jest.fn(),
    markTaskPending: jest.fn(),
    markTaskDeferred: jest.fn(),
    markTaskComplete: jest.fn(),
    markTaskFailed: jest.fn(),
  };
  const metrics = { recordReadings: jest.fn() };
  const memory = {
    retrieveSafeContext: jest.fn().mockResolvedValue({ owner: 'owner-1', records: [], promptBlock: 'Voice: warm, short.' }),
    recordLearning: jest.fn(),
  };
  const privacyFilter = { containsSealedTopic: jest.fn().mockReturnValue(false) };
  const identity = {
    getCredentials: jest.fn().mockResolvedValue(CREDENTIALS),
    recordChallenge: jest.fn(),
    countRecentChallenges: jest.fn().mockResolvedValue(3),
  };
  const reporting = { raiseEscalation: jest.fn() };

  const processor = new TaskExecutionProcessor(
    execution as unknown as ExecutionProvider,
    taskQueue as unknown as Queue<TaskExecutionJobData>,
    reasoning as unknown as TaskReasoningService,
    workflows as unknown as WorkflowService,
    tasks as unknown as TaskService,
    metrics as unknown as MetricsService,
    memory as unknown as MemoryRetrievalService,
    privacyFilter as unknown as PrivacyFilterService,
    identity as unknown as IdentityService,
    reporting as unknown as ReportingService,
  );
  const run = () => processor.process({ data: { workflowId: WORKFLOW_ID, taskId: TASK_ID } } as Job<TaskExecutionJobData>);

  return { run, task, execution, taskQueue, reasoning, workflows, tasks, metrics, memory, privacyFilter, identity, reporting };
}

describe('TaskExecutionProcessor', () => {
  it('skips the Task when the Workflow is not running', async () => {
    const t = setup();
    t.workflows.findWorkflowById.mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'paused' });

    expect(await t.run()).toBeNull();
    expect(t.tasks.markTaskRunning).not.toHaveBeenCalled();
    expect(t.tasks.markTaskPending).not.toHaveBeenCalled();
  });

  it.each(['running', 'complete', 'failed', 'escalated'])(
    'skips a %s Task, so a duplicate delivery never runs it twice',
    async (status) => {
      const t = setup();
      t.tasks.findTaskWithLineage.mockResolvedValue({ ...t.task, status });

      expect(await t.run()).toBeNull();
      expect(t.tasks.markTaskRunning).not.toHaveBeenCalled();
      expect(t.reasoning.planNextStep).not.toHaveBeenCalled();
    },
  );

  it('runs a deferred Task once its delay is up', async () => {
    const t = setup();
    t.tasks.findTaskWithLineage.mockResolvedValue({ ...t.task, status: 'deferred' });
    t.reasoning.planNextStep.mockResolvedValueOnce(step({ isTaskDone: true }));

    const outcome = await t.run();

    expect(t.tasks.markTaskRunning).toHaveBeenCalledWith(TASK_ID);
    expect(outcome?.status).toBe('complete');
  });

  it('puts a deferred Task that comes due while the Workflow is paused back to pending, without running it', async () => {
    const t = setup();
    t.tasks.findTaskWithLineage.mockResolvedValue({ ...t.task, status: 'deferred' });
    t.workflows.findWorkflowById.mockResolvedValue({ id: WORKFLOW_ID, owner: 'owner-1', state: 'paused' });

    expect(await t.run()).toBeNull();
    expect(t.tasks.markTaskPending).toHaveBeenCalledWith(TASK_ID);
    expect(t.tasks.markTaskRunning).not.toHaveBeenCalled();
  });

  it('loops plan → execute until reasoning says done, then completes and queues the next Task', async () => {
    const t = setup();
    t.reasoning.planNextStep
      .mockResolvedValueOnce(step())
      .mockResolvedValueOnce(step({ instruction: 'Reply to the top post', platform: 'reddit.com' }))
      .mockResolvedValueOnce(step({ isTaskDone: true }));
    t.execution.runTask
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(result({ summary: 'Reply posted.', metricReadings: { upvotes: 2 } }));
    t.tasks.findNextPendingTask.mockResolvedValue({ id: 'task-2' });

    const outcome = await t.run();

    expect(outcome).toEqual({ taskId: TASK_ID, status: 'complete', summary: 'Reply posted.', iterations: 2, retryAfterMinutes: null });
    expect(t.tasks.markTaskRunning).toHaveBeenCalledWith(TASK_ID);
    expect(t.tasks.markTaskComplete).toHaveBeenCalledWith({
      taskId: TASK_ID,
      result: { summary: 'Reply posted.', metricReadings: { upvotes: 2 }, completedAt: expect.any(Date) },
    });
    expect(t.metrics.recordReadings).toHaveBeenCalledWith({ unitOfWorkId: 'unit-1', taskId: TASK_ID, readings: { upvotes: 2 } });
    expect(t.taskQueue.add).toHaveBeenCalledWith('task-2', { workflowId: WORKFLOW_ID, taskId: 'task-2' });
  });

  it('feeds every execution result back to reasoning unchanged, with the Task and safe context', async () => {
    const t = setup();
    const first = result();
    t.reasoning.planNextStep.mockResolvedValueOnce(step()).mockResolvedValueOnce(step({ isTaskDone: true }));
    t.execution.runTask.mockResolvedValueOnce(first);

    await t.run();

    expect(t.reasoning.planNextStep).toHaveBeenLastCalledWith({
      taskAction: t.task.action,
      jobObjective: 'Engage with r/AICompanion',
      safeContext: 'Voice: warm, short.',
      history: [{ instruction: step().instruction, platform: null, result: first }],
      recentChallengeCount: 0,
    });
  });

  it('sends the login to the execution layer only, never to reasoning', async () => {
    const t = setup();
    t.reasoning.planNextStep
      .mockResolvedValueOnce(step({ platform: 'reddit.com' }))
      .mockResolvedValueOnce(step({ isTaskDone: true }));
    t.execution.runTask.mockResolvedValueOnce(result());

    await t.run();

    expect(t.identity.getCredentials).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, platform: 'reddit.com' });
    expect(t.execution.runTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: TASK_ID, credentials: CREDENTIALS }));
    expect(JSON.stringify(t.reasoning.planNextStep.mock.calls)).not.toContain(CREDENTIALS.password);
  });

  it('refuses a step whose instruction mentions a sealed topic, without executing it', async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValueOnce(step());
    t.privacyFilter.containsSealedTopic.mockReturnValue(true);

    const outcome = await t.run();

    expect(outcome?.status).toBe('failed');
    expect(t.execution.runTask).not.toHaveBeenCalled();
    expect(t.tasks.markTaskFailed).toHaveBeenCalledWith({ taskId: TASK_ID, reason: expect.stringContaining('sealed topic') });
  });

  it('escalates a step that needs human judgment', async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValueOnce(step({ needsHumanJudgment: true, instruction: 'Spend $50 on a promoted post?' }));

    const outcome = await t.run();

    expect(outcome?.status).toBe('escalated');
    expect(t.reporting.raiseEscalation).toHaveBeenCalledWith({
      workflowId: WORKFLOW_ID,
      taskId: TASK_ID,
      question: 'Spend $50 on a promoted post?',
    });
    expect(t.execution.runTask).not.toHaveBeenCalled();
  });

  it('logs a gate, tells reasoning how often the account was challenged, and defers when asked to wait', async () => {
    const t = setup();
    const blocker = { kind: 'rate_limited' as const, detail: 'You are doing that too much. Try again in 9 minutes.' };
    t.reasoning.planNextStep.mockResolvedValueOnce(step({ platform: 'reddit.com' }));
    t.execution.runTask.mockResolvedValueOnce(result({ status: 'blocked', blocker }));
    t.reasoning.decideOnBlocker.mockResolvedValueOnce(
      decision({ retryAfterMinutes: 10, learning: 'reddit.com rate-limits new accounts after 3 comments an hour' }),
    );

    const outcome = await t.run();

    expect(outcome).toEqual(expect.objectContaining({ status: 'deferred', retryAfterMinutes: 10 }));
    expect(t.identity.recordChallenge).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, platform: 'reddit.com', taskId: TASK_ID, blocker });
    expect(t.reasoning.decideOnBlocker).toHaveBeenCalledWith(expect.objectContaining({ recentChallengeCount: 3 }));
    expect(t.tasks.markTaskDeferred).toHaveBeenCalledWith(TASK_ID);
    expect(t.taskQueue.add).toHaveBeenCalledWith(TASK_ID, { workflowId: WORKFLOW_ID, taskId: TASK_ID }, { delay: 600_000 });
    expect(t.memory.recordLearning).toHaveBeenCalledWith({
      owner: 'owner-1',
      workflowId: WORKFLOW_ID,
      content: 'reddit.com rate-limits new accounts after 3 comments an hour',
    });
  });

  it('runs the workaround step reasoning plans around a gate', async () => {
    const t = setup();
    const workaround = step({ instruction: 'Post the reply from the old.reddit.com thread page instead' });
    t.reasoning.planNextStep.mockResolvedValueOnce(step()).mockResolvedValueOnce(step({ isTaskDone: true }));
    t.execution.runTask
      .mockResolvedValueOnce(result({ status: 'blocked', blocker: { kind: 'other', detail: 'Reply box disabled' } }))
      .mockResolvedValueOnce(result({ summary: 'Reply posted via old.reddit.com.' }));
    t.reasoning.decideOnBlocker.mockResolvedValueOnce(decision({ nextStep: workaround }));

    const outcome = await t.run();

    expect(t.execution.runTask).toHaveBeenLastCalledWith(expect.objectContaining({ instruction: workaround.instruction }));
    expect(outcome).toEqual(expect.objectContaining({ status: 'complete', summary: 'Reply posted via old.reddit.com.' }));
  });

  it('escalates when only the owner can clear the gate, even if a delay was also suggested', async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValueOnce(step({ platform: 'reddit.com' }));
    t.execution.runTask.mockResolvedValueOnce(
      result({ status: 'blocked', blocker: { kind: 'verification_code', detail: 'Enter the code sent to your email' } }),
    );
    t.reasoning.decideOnBlocker.mockResolvedValueOnce(
      decision({ ownerRequest: 'Please enter the reddit.com email code', retryAfterMinutes: 30 }),
    );

    const outcome = await t.run();

    expect(outcome?.status).toBe('escalated');
    expect(t.reporting.raiseEscalation).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Please enter the reddit.com email code' }),
    );
    expect(t.taskQueue.add).not.toHaveBeenCalled();
  });

  it('fails the Task when the blocker decision gives no way forward', async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValueOnce(step());
    t.execution.runTask.mockResolvedValueOnce(result({ status: 'blocked', blocker: { kind: 'account_restricted', detail: 'Suspended' } }));
    t.reasoning.decideOnBlocker.mockResolvedValueOnce(decision({ rationale: 'Account suspended; not worth pursuing' }));

    const outcome = await t.run();

    expect(outcome?.status).toBe('failed');
    expect(t.tasks.markTaskFailed).toHaveBeenCalledWith({ taskId: TASK_ID, reason: 'Account suspended; not worth pursuing' });
  });

  it(`fails the Task after ${MAX_TASK_ITERATIONS} steps without finishing`, async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValue(step());
    t.execution.runTask.mockResolvedValue(result());

    const outcome = await t.run();

    expect(t.execution.runTask).toHaveBeenCalledTimes(MAX_TASK_ITERATIONS);
    expect(outcome).toEqual(expect.objectContaining({ status: 'failed', iterations: MAX_TASK_ITERATIONS }));
    expect(t.tasks.findNextPendingTask).not.toHaveBeenCalled();
  });

  it('marks the Task failed and rethrows when something crashes mid-run', async () => {
    const t = setup();
    t.reasoning.planNextStep.mockResolvedValueOnce(step());
    t.execution.runTask.mockRejectedValueOnce(new Error('Screen Recording permission missing'));

    await expect(t.run()).rejects.toThrow('Screen Recording permission missing');
    expect(t.tasks.markTaskFailed).toHaveBeenCalledWith({ taskId: TASK_ID, reason: 'Screen Recording permission missing' });
  });
});
