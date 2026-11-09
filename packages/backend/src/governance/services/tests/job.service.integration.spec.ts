import type { JobOutcomeStatus, TaskStatus } from '@agentcores/agent-core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEntity } from '../../entities/job.entity';
import { TaskEntity } from '../../entities/task.entity';
import { JobService } from '../job.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

describeWithDatabase('JobService (Postgres)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let seeder: GovernanceSeeder;
  let service: JobService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'job_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [JobService, GovernanceSeeder],
    }).compile();
    dataSource = moduleRef.get(DataSource);
    seeder = moduleRef.get(GovernanceSeeder);
    service = moduleRef.get(JobService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seeder.clear();
  });

  describe('listStartableJobs and countActiveJobs', () => {
    async function workflowWithJobs(jobs: Record<string, readonly TaskStatus[]>, awaitingReview: readonly string[] = []) {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Community engagement');
      const ids: Record<string, string> = {};
      for (const [name, statuses] of Object.entries(jobs)) {
        const job = await seeder.job(unit.id, name);
        await seeder.tasks(workflow.id, job.id, statuses, awaitingReview.includes(name));
        ids[name] = job.id;
      }
      return { workflow, strategy, unit, ids };
    }

    it('starts new Jobs, Jobs with a Task awaiting review, and Jobs whose current Task is pending', async () => {
      const { workflow, unit, ids } = await workflowWithJobs(
        {
          new: [],
          ready: ['complete', 'failed', 'cancelled', 'pending'],
          justCompleted: ['complete', 'pending'],
          justFailed: ['complete', 'failed', 'pending'],
          running: ['complete', 'running', 'pending'],
          deferred: ['deferred', 'pending'],
          escalated: ['escalated', 'pending'],
          finished: ['complete', 'cancelled'],
        },
        ['justCompleted', 'justFailed'],
      );
      await seeder.job(unit.id, 'Closed', 'success');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id).sort()).toEqual([ids.new, ids.ready, ids.justCompleted, ids.justFailed].sort());
      expect(startable[0].unitOfWork.name).toBe('Community engagement');
    });

    it('counts Jobs whose current Task is running, deferred, or escalated as active', async () => {
      const { workflow } = await workflowWithJobs({
        new: [],
        ready: ['pending'],
        running: ['running'],
        deferred: ['complete', 'deferred'],
        escalated: ['escalated'],
        failed: ['failed'],
        done: ['complete'],
        cancelled: ['complete', 'cancelled'],
      });

      expect(await service.countActiveJobs(workflow.id)).toBe(3);
    });

    it('skips paused and complete Units, and Strategies the Workflow does not run', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      await seeder.job((await seeder.unit(strategy.id, 'Round 1', { status: 'complete' })).id, 'In a complete Unit');
      await seeder.job((await seeder.unit(strategy.id, 'Round 2', { state: 'paused' })).id, 'In a paused Unit');
      const otherStrategy = await seeder.strategy();
      await seeder.job((await seeder.unit(otherStrategy.id, 'Round 1')).id, 'In another Strategy');
      const active = await seeder.job((await seeder.unit(strategy.id, 'Round 3')).id, 'Startable');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id)).toEqual([active.id]);
    });

    it('still starts Jobs in an evaluating Unit, which is where evidence Jobs live', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const evidence = await seeder.job((await seeder.unit(strategy.id, 'Round 1', { status: 'evaluating' })).id, 'Read the upvotes');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id)).toEqual([evidence.id]);
    });

    it('puts older Units first, then older Jobs, up to the limit', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const first = await seeder.unit(strategy.id, 'Round 1', { status: 'evaluating' });
      const second = await seeder.unit(strategy.id, 'Round 2');
      await seeder.job(second.id, 'Second round');
      const older = await seeder.job(first.id, 'First round, older');
      const newer = await seeder.job(first.id, 'First round, newer');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 2 });

      expect(startable.map((job) => job.id)).toEqual([older.id, newer.id]);
    });
  });

  describe('Job order', () => {
    async function steps(...outcomes: (JobOutcomeStatus | null)[]) {
      const { workflow, strategy } = await seeder.strategyWithWorkflow('owner-1', 'one_off');
      const unit = await seeder.unit(strategy.id, 'Attempt 1');
      const ids: string[] = [];
      for (const [index, outcome] of outcomes.entries()) {
        ids.push((await seeder.job(unit.id, `Step ${index + 1}`, outcome, index + 1)).id);
      }
      return { workflow, unit, ids };
    }

    const startableIds = async (workflowId: string) => (await service.listStartableJobs({ workflowId, limit: 10 })).map((job) => job.id);

    it('starts only the first ordered Job that has not succeeded', async () => {
      const { workflow, ids } = await steps('success', null, null);

      expect(await startableIds(workflow.id)).toEqual([ids[1]]);
    });

    it('holds an ordered Job back while the one before it is still running', async () => {
      const { workflow, ids } = await steps(null, null);
      await seeder.tasks(workflow.id, ids[0], ['running']);

      expect(await startableIds(workflow.id)).toEqual([]);
    });

    it('runs unordered Jobs alongside the ordered chain', async () => {
      const { workflow, unit, ids } = await steps(null, null);
      const free = await seeder.job(unit.id, 'Unordered');

      expect((await startableIds(workflow.id)).sort()).toEqual([ids[0], free.id].sort());
    });

    it('skips the ordered Jobs behind one that did not succeed, and leaves the rest alone', async () => {
      const { workflow, unit, ids } = await steps('success', 'failed', null, null);
      const free = await seeder.job(unit.id, 'Unordered');

      expect(await service.skipStepsAfterFailure(unit.id)).toBe(2);

      const jobs = dataSource.getRepository(JobEntity);
      for (const id of ids.slice(2)) {
        expect(await jobs.findOneByOrFail({ id })).toMatchObject({
          outcomeStatus: 'abandoned',
          outcomeSummary: 'Skipped: an earlier step did not succeed.',
        });
      }
      expect((await jobs.findOneByOrFail({ id: free.id })).outcomeStatus).toBeNull();
      expect(await startableIds(workflow.id)).toEqual([free.id]);
      expect(await service.skipStepsAfterFailure(unit.id)).toBe(0);
    });
  });

  describe('countUnitJobs and listJobsToEvaluate', () => {
    it('counts the Unit\u2019s Jobs and how many are still open', async () => {
      const { strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Round 1');
      await seeder.job(unit.id, 'Open');
      await seeder.job(unit.id, 'Closed', 'success');

      expect(await service.countUnitJobs(unit.id)).toEqual({ total: 2, open: 1 });
    });

    it('evaluates the closed Jobs that ran a Task, but not skipped steps, open Jobs, or evidence Jobs', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Round 1');
      const posted = await seeder.job(unit.id, 'Post an intro', 'success');
      await seeder.tasks(workflow.id, posted.id, ['complete']);
      const failed = await seeder.job(unit.id, 'Reply to comments', 'failed');
      await seeder.tasks(workflow.id, failed.id, ['complete', 'failed']);
      await seeder.job(unit.id, 'Skipped step', 'abandoned');
      const open = await seeder.job(unit.id, 'Still open');
      await seeder.tasks(workflow.id, open.id, ['complete', 'pending']);
      const evidence = await seeder.job(unit.id, 'Read the upvotes', 'success');
      await seeder.tasks(workflow.id, evidence.id, ['complete']);
      await dataSource
        .getRepository(JobEvaluationEntity)
        .save({ owner: strategy.owner, jobId: posted.id, unitOfWorkId: unit.id, evidenceJobId: evidence.id });

      const toEvaluate = await service.listJobsToEvaluate(unit.id);

      expect(toEvaluate.map((job) => job.name)).toEqual(['Post an intro', 'Reply to comments']);
      expect(toEvaluate[0].unitOfWork.strategy.owner).toBe('owner-1');
    });
  });

  describe('closeJob', () => {
    it('records the outcome once and cancels the Tasks that had not started', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const job = await seeder.job((await seeder.unit(strategy.id, 'Community engagement')).id);
      await seeder.tasks(workflow.id, job.id, ['complete', 'pending', 'pending']);

      expect(await service.closeJob({ jobId: job.id, status: 'abandoned', summary: 'The community is inactive.' })).toBe(true);
      expect(await service.closeJob({ jobId: job.id, status: 'success', summary: 'Too late.' })).toBe(false);

      const closed = await dataSource.getRepository(JobEntity).findOneByOrFail({ id: job.id });
      expect(closed).toEqual(
        expect.objectContaining({ outcomeStatus: 'abandoned', outcomeSummary: 'The community is inactive.', closedAt: expect.any(Date) }),
      );
      const statuses = (await dataSource.getRepository(TaskEntity).find({ where: { jobId: job.id }, order: { sequence: 'ASC' } })).map(
        (task) => task.status,
      );
      expect(statuses).toEqual(['complete', 'cancelled', 'cancelled']);
      expect(await service.listStartableJobs({ workflowId: workflow.id, limit: 10 })).toEqual([]);
    });
  });

  describe('reviewing attempts', () => {
    it('counts attempts atomically and resets them', async () => {
      const { strategy } = await seeder.strategyWithWorkflow();
      const job = await seeder.job((await seeder.unit(strategy.id, 'Community engagement')).id);

      const counts = await Promise.all([service.recordReviewingAttempt(job.id), service.recordReviewingAttempt(job.id)]);
      expect(counts.sort()).toEqual([1, 2]);

      await service.resetReviewingAttempts(job.id);
      expect(await service.recordReviewingAttempt(job.id)).toBe(1);
    });
  });
});
