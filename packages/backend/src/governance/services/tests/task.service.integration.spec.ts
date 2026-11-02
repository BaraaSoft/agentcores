import type { TaskStatus } from '@ahe/agent-core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import type { PlannedTask } from '../../../reasoning/job/types/planned-task';
import { JobEntity } from '../../entities/job.entity';
import { TaskEntity } from '../../entities/task.entity';
import { UnitOfWorkEntity } from '../../entities/unit-of-work.entity';
import { TaskService } from '../task.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

describeWithDatabase('TaskService (Postgres)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let seeder: GovernanceSeeder;
  let service: TaskService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'task_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [TaskService, GovernanceSeeder],
    }).compile();
    dataSource = moduleRef.get(DataSource);
    seeder = moduleRef.get(GovernanceSeeder);
    service = moduleRef.get(TaskService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seeder.clear();
  });

  async function jobWithTasks(statuses: readonly TaskStatus[], isAwaitingReview = false) {
    const { workflow, strategy } = await seeder.strategyWithWorkflow();
    const unit = await seeder.unit(strategy.id, 'Community engagement');
    const job = await seeder.job(unit.id);
    const tasks = await seeder.tasks(workflow.id, job.id, statuses, isAwaitingReview);
    return { workflow, job, tasks };
  }

  const reload = (taskId: string) => dataSource.getRepository(TaskEntity).findOneByOrFail({ id: taskId });
  const statusesOf = async (jobId: string) => (await service.listTasks(jobId)).map((task) => [task.action, task.sequence, task.status]);

  const general = (...actions: string[]): PlannedTask[] => actions.map((action) => ({ action, skillType: 'general' }));

  describe('replaceRemainingTasks', () => {
    it('writes the first plan in order', async () => {
      const { workflow, job } = await jobWithTasks([]);

      const pending = await service.replaceRemainingTasks({
        workflowId: workflow.id,
        jobId: job.id,
        tasks: [
          { action: 'Open', skillType: 'general' },
          { action: 'Design the post', skillType: 'creative_design' },
        ],
      });

      expect(pending.map((task) => [task.action, task.skillType, task.sequence, task.status])).toEqual([
        ['Open', 'general', 1, 'pending'],
        ['Design the post', 'creative_design', 2, 'pending'],
      ]);
      expect(await service.hasTasks(job.id)).toBe(true);
    });

    it('leaves the plan alone when it is unchanged', async () => {
      const { workflow, job, tasks } = await jobWithTasks(['complete', 'pending', 'pending']);

      const pending = await service.replaceRemainingTasks({
        workflowId: workflow.id,
        jobId: job.id,
        tasks: general('Action 2', 'Action 3'),
      });

      expect(pending.map((task) => task.id)).toEqual([tasks[1].id, tasks[2].id]);
      expect(await dataSource.getRepository(TaskEntity).count()).toBe(3);
    });

    it('replaces the plan when only a skill changed', async () => {
      const { workflow, job } = await jobWithTasks(['pending']);

      const pending = await service.replaceRemainingTasks({
        workflowId: workflow.id,
        jobId: job.id,
        tasks: [{ action: 'Action 1', skillType: 'creative_design' }],
      });

      expect(pending.map((task) => [task.action, task.skillType, task.sequence])).toEqual([['Action 1', 'creative_design', 2]]);
    });

    it('cancels the pending Tasks and appends the new plan after the last Task', async () => {
      const { workflow, job } = await jobWithTasks(['complete', 'failed', 'pending', 'pending']);

      await service.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, tasks: general('Retry differently', 'Action 4') });

      expect(await statusesOf(job.id)).toEqual([
        ['Action 1', 1, 'complete'],
        ['Action 2', 2, 'failed'],
        ['Action 3', 3, 'cancelled'],
        ['Action 4', 4, 'cancelled'],
        ['Retry differently', 5, 'pending'],
        ['Action 4', 6, 'pending'],
      ]);
      expect((await service.findNextPendingTask(job.id))?.action).toBe('Retry differently');
    });

    it('cancels every pending Task for an empty plan', async () => {
      const { workflow, job } = await jobWithTasks(['complete', 'pending']);

      expect(await service.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, tasks: [] })).toEqual([]);
      expect(await statusesOf(job.id)).toEqual([
        ['Action 1', 1, 'complete'],
        ['Action 2', 2, 'cancelled'],
      ]);
    });
  });

  describe('findNextPendingTask — the current Task rule', () => {
    it('returns the first unfinished Task when it is pending, skipping complete, failed, and cancelled ones', async () => {
      const { job, tasks } = await jobWithTasks(['complete', 'failed', 'cancelled', 'pending', 'pending']);

      expect((await service.findNextPendingTask(job.id))?.id).toBe(tasks[3].id);
    });

    it.each<TaskStatus>(['running', 'deferred', 'escalated'])(
      'returns null when the current Task is %s, even with pending Tasks after it',
      async (status) => {
        const { job } = await jobWithTasks(['complete', status, 'pending']);

        expect(await service.findNextPendingTask(job.id)).toBeNull();
      },
    );

    it.each<TaskStatus>(['complete', 'failed'])('returns null while a %s Task awaits review', async (status) => {
      const { job } = await jobWithTasks([status, 'pending'], true);

      expect(await service.findNextPendingTask(job.id)).toBeNull();
    });

    it('returns null when every Task is finished', async () => {
      const { job } = await jobWithTasks(['complete', 'failed', 'cancelled']);

      expect(await service.findNextPendingTask(job.id)).toBeNull();
    });
  });

  describe('reviews', () => {
    it('finds the finished Task awaiting review, then releases the Job once it is reviewed', async () => {
      const { job, tasks } = await jobWithTasks(['complete', 'failed', 'pending'], true);

      expect((await service.findUnreviewedTask(job.id))?.id).toBe(tasks[1].id);
      expect(await service.markTaskReviewed(tasks[1].id)).toBe(true);
      expect(await service.markTaskReviewed(tasks[1].id)).toBe(false);

      expect(await service.findUnreviewedTask(job.id)).toBeNull();
      expect((await service.findNextPendingTask(job.id))?.id).toBe(tasks[2].id);
    });

    it('never asks to review a cancelled Task', async () => {
      const { job, tasks } = await jobWithTasks(['cancelled', 'pending']);

      expect(await service.findUnreviewedTask(job.id)).toBeNull();
      expect(await service.markTaskReviewed(tasks[0].id)).toBe(false);
    });
  });

  it('loads a Task with its Job, Unit, and Strategy', async () => {
    const { tasks } = await jobWithTasks(['pending']);

    const task = await service.findTaskWithLineage(tasks[0].id);

    expect(task?.job.unitOfWork.name).toBe('Community engagement');
    expect(task?.job.unitOfWork.strategy.name).toBe('October');
  });

  describe('status transitions', () => {
    it('lets only one caller claim a Task', async () => {
      const { tasks } = await jobWithTasks(['pending']);

      const claims = await Promise.all([service.markTaskRunning(tasks[0].id), service.markTaskRunning(tasks[0].id)]);

      expect(claims.sort()).toEqual([false, true]);
      expect((await reload(tasks[0].id)).startedAt).toBeInstanceOf(Date);
    });

    it('runs a deferred Task again', async () => {
      const { tasks } = await jobWithTasks(['deferred']);

      expect(await service.markTaskRunning(tasks[0].id)).toBe(true);
    });

    it('stores the result and location when a running Task completes', async () => {
      const { tasks } = await jobWithTasks(['running']);
      const completedAt = new Date('2026-10-24T09:00:00Z');

      const changed = await service.markTaskComplete({
        taskId: tasks[0].id,
        result: { summary: 'Reply posted.', metricReadings: { upvotes: 2 }, completedAt },
        locationPath: 'reddit.com/r/AICompanion/comments/abc123',
        locationDetails: null,
      });

      const task = await reload(tasks[0].id);
      expect(changed).toBe(true);
      expect(task.status).toBe('complete');
      expect(task.completedAt).toEqual(completedAt);
      expect(task.result).toEqual({
        summary: 'Reply posted.',
        metricReadings: { upvotes: 2 },
        completedAt: completedAt.toISOString(),
      });
      expect(task).toEqual(expect.objectContaining({ locationPath: 'reddit.com/r/AICompanion/comments/abc123', locationDetails: null }));
    });

    it('defers a running Task and clears its start time', async () => {
      const { tasks } = await jobWithTasks(['pending']);
      await service.markTaskRunning(tasks[0].id);

      expect(await service.markTaskDeferred(tasks[0].id)).toBe(true);
      expect(await reload(tasks[0].id)).toEqual(expect.objectContaining({ status: 'deferred', startedAt: null }));
    });

    it('escalates a running Task, then puts it back to pending when the owner approves', async () => {
      const { tasks } = await jobWithTasks(['running']);

      await service.markTaskEscalated({ taskId: tasks[0].id, reason: 'Spend $50?' });
      expect(await reload(tasks[0].id)).toEqual(expect.objectContaining({ status: 'escalated', failureReason: 'Spend $50?' }));

      expect(await service.markTaskPending(tasks[0].id)).toBe(true);
      expect(await reload(tasks[0].id)).toEqual(expect.objectContaining({ status: 'pending', failureReason: null }));
    });

    it('fails an escalated Task the owner rejected', async () => {
      const { tasks } = await jobWithTasks(['escalated']);

      expect(await service.markTaskFailed({ taskId: tasks[0].id, reason: 'Owner said no' })).toBe(true);
      expect((await reload(tasks[0].id)).status).toBe('failed');
    });

    it.each<[string, (taskId: string) => Promise<boolean>, TaskStatus]>([
      [
        'complete a pending Task',
        (taskId) =>
          service.markTaskComplete({
            taskId,
            result: { summary: '', metricReadings: {}, completedAt: new Date() },
            locationPath: null,
            locationDetails: null,
          }),
        'pending',
      ],
      ['run a complete Task', (taskId) => service.markTaskRunning(taskId), 'complete'],
      ['put a failed Task back to pending', (taskId) => service.markTaskPending(taskId), 'failed'],
      ['defer a pending Task', (taskId) => service.markTaskDeferred(taskId), 'pending'],
      ['run a cancelled Task', (taskId) => service.markTaskRunning(taskId), 'cancelled'],
    ])('refuses to %s', async (_label, transition, status) => {
      const { tasks } = await jobWithTasks([status]);

      expect(await transition(tasks[0].id)).toBe(false);
      expect((await reload(tasks[0].id)).status).toBe(status);
    });
  });
  describe('pausing a run', () => {
    it('tells a running Task that its run is paused, so it stops before its next step', async () => {
      const { tasks, job } = await jobWithTasks(['running']);

      expect(await service.isTaskPaused(tasks[0].id)).toBe(false);
      await dataSource.getRepository(UnitOfWorkEntity).update({ id: job.unitOfWorkId }, { state: 'paused' });
      expect(await service.isTaskPaused(tasks[0].id)).toBe(true);
    });

    it('counts the running Tasks of each Workflow, so the UI knows when a paused run has freed the machine', async () => {
      const first = await jobWithTasks(['running', 'pending', 'complete']);
      await jobWithTasks(['pending']);

      expect(await service.countRunningTasksByWorkflow()).toEqual(new Map([[first.workflow.id, 1]]));
    });

    it('finds the running Tasks whose work is not running, and leaves the healthy ones out', async () => {
      const longAgo = new Date('2026-11-01T00:00:00Z');
      const stuckBefore = new Date('2026-11-02T00:00:00Z');
      const recent = new Date('2026-11-02T09:00:00Z');
      const start = (taskId: string, startedAt: Date) => dataSource.getRepository(TaskEntity).update({ id: taskId }, { startedAt });

      const healthy = await jobWithTasks(['running']);
      await start(healthy.tasks[0].id, recent);
      const paused = await jobWithTasks(['running']);
      await start(paused.tasks[0].id, recent);
      await dataSource.getRepository(UnitOfWorkEntity).update({ id: paused.job.unitOfWorkId }, { state: 'paused' });
      const closed = await jobWithTasks(['running']);
      await start(closed.tasks[0].id, new Date(recent.getTime() + 60_000));
      await dataSource.getRepository(JobEntity).update({ id: closed.job.id }, { outcomeStatus: 'success' });
      const stuck = await jobWithTasks(['running']);
      await start(stuck.tasks[0].id, longAgo);

      const strays = await service.listStrayRunningTasks(stuckBefore);

      expect(strays.map((task) => task.taskId)).toEqual([stuck.tasks[0].id, paused.tasks[0].id, closed.tasks[0].id]);
      expect(strays[1]).toMatchObject({ unitOfWorkState: 'paused', workflowState: 'running', jobOutcome: null, jobId: paused.job.id });
      expect(strays[2]).toMatchObject({ jobOutcome: 'success', workflowId: closed.workflow.id, taskWorkflowId: closed.workflow.id });
    });
  });
});
