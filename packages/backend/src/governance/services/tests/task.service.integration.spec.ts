import type { TaskStatus } from '@ahe/agent-core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { TaskEntity } from '../../entities/task.entity';
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
    const { workflow, strategy } = await seeder.workflowWithActiveStrategy();
    const unit = await seeder.unit(strategy.id, 'Community engagement');
    const job = await seeder.job(unit.id);
    const tasks = await seeder.tasks(workflow.id, job.id, statuses, isAwaitingReview);
    return { workflow, job, tasks };
  }

  const reload = (taskId: string) => dataSource.getRepository(TaskEntity).findOneByOrFail({ id: taskId });
  const statusesOf = async (jobId: string) =>
    (await service.listTasks(jobId)).map((task) => [task.action, task.sequence, task.status]);

  describe('replaceRemainingTasks', () => {
    it('writes the first plan in order', async () => {
      const { workflow, job } = await jobWithTasks([]);

      const pending = await service.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, actions: ['Open', 'Reply'] });

      expect(pending.map((task) => [task.action, task.sequence, task.status])).toEqual([
        ['Open', 1, 'pending'],
        ['Reply', 2, 'pending'],
      ]);
      expect(await service.hasTasks(job.id)).toBe(true);
    });

    it('leaves the plan alone when it is unchanged', async () => {
      const { workflow, job, tasks } = await jobWithTasks(['complete', 'pending', 'pending']);

      const pending = await service.replaceRemainingTasks({
        workflowId: workflow.id,
        jobId: job.id,
        actions: ['Action 2', 'Action 3'],
      });

      expect(pending.map((task) => task.id)).toEqual([tasks[1].id, tasks[2].id]);
      expect(await dataSource.getRepository(TaskEntity).count()).toBe(3);
    });

    it('cancels the pending Tasks and appends the new plan after the last Task', async () => {
      const { workflow, job } = await jobWithTasks(['complete', 'failed', 'pending', 'pending']);

      await service.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, actions: ['Retry differently', 'Action 4'] });

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

      expect(await service.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, actions: [] })).toEqual([]);
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

    it('stores the result when a running Task completes', async () => {
      const { tasks } = await jobWithTasks(['running']);
      const completedAt = new Date('2026-10-24T09:00:00Z');

      const changed = await service.markTaskComplete({
        taskId: tasks[0].id,
        result: { summary: 'Reply posted.', metricReadings: { upvotes: 2 }, completedAt },
      });

      const task = await reload(tasks[0].id);
      expect(changed).toBe(true);
      expect(task.status).toBe('complete');
      expect(task.completedAt).toEqual(completedAt);
      expect(task.result).toEqual({ summary: 'Reply posted.', metricReadings: { upvotes: 2 }, completedAt: completedAt.toISOString() });
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
      ['complete a pending Task', (taskId) => service.markTaskComplete({ taskId, result: { summary: '', metricReadings: {}, completedAt: new Date() } }), 'pending'],
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
});
