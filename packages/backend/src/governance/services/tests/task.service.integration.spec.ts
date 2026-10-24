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

  async function jobWithTasks(statuses: readonly TaskStatus[]) {
    const { workflow, strategy } = await seeder.workflowWithActiveStrategy();
    const unit = await seeder.unit(strategy.id, 'Community engagement');
    const job = await seeder.job(unit.id);
    const tasks = await seeder.tasks(workflow.id, job.id, statuses);
    return { workflow, job, tasks };
  }

  const reload = (taskId: string) => dataSource.getRepository(TaskEntity).findOneByOrFail({ id: taskId });

  describe('createTasks', () => {
    it('numbers the actions in order, after any Tasks the Job already has', async () => {
      const { workflow, job } = await jobWithTasks(['complete']);

      const created = await service.createTasks({ workflowId: workflow.id, jobId: job.id, actions: ['Open', 'Reply'] });

      expect(created.map((task) => [task.action, task.sequence, task.status])).toEqual([
        ['Open', 2, 'pending'],
        ['Reply', 3, 'pending'],
      ]);
      expect(await service.hasTasks(job.id)).toBe(true);
    });

    it('creates nothing for an empty breakdown', async () => {
      const { workflow, job } = await jobWithTasks([]);

      expect(await service.createTasks({ workflowId: workflow.id, jobId: job.id, actions: [] })).toEqual([]);
      expect(await service.hasTasks(job.id)).toBe(false);
    });
  });

  describe('findNextPendingTask — the current Task rule', () => {
    it('returns the first Task that is not complete, when it is pending', async () => {
      const { job, tasks } = await jobWithTasks(['complete', 'pending', 'pending']);

      expect((await service.findNextPendingTask(job.id))?.id).toBe(tasks[1].id);
    });

    it.each<TaskStatus>(['running', 'deferred', 'escalated', 'failed'])(
      'returns null when the current Task is %s, even with pending Tasks after it',
      async (status) => {
        const { job } = await jobWithTasks(['complete', status, 'pending']);

        expect(await service.findNextPendingTask(job.id)).toBeNull();
      },
    );

    it('returns null when every Task is complete', async () => {
      const { job } = await jobWithTasks(['complete', 'complete']);

      expect(await service.findNextPendingTask(job.id)).toBeNull();
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
    ])('refuses to %s', async (_label, transition, status) => {
      const { tasks } = await jobWithTasks([status]);

      expect(await transition(tasks[0].id)).toBe(false);
      expect((await reload(tasks[0].id)).status).toBe(status);
    });
  });
});
