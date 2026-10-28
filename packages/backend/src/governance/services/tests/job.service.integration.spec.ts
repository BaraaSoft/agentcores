import type { TaskStatus } from '@ahe/agent-core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEntity } from '../../entities/job.entity';
import { TaskEntity } from '../../entities/task.entity';
import { UnitOfWorkEntity } from '../../entities/unit-of-work.entity';
import { JobService } from '../job.service';
import { UnitOfWorkService } from '../unit-of-work.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

describeWithDatabase('JobService (Postgres)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let seeder: GovernanceSeeder;
  let service: JobService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'job_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [JobService, UnitOfWorkService, GovernanceSeeder],
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

    it('skips deprecated Units and Strategies the Workflow does not run', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const deprecated = await seeder.unit(strategy.id, 'Old theme', 0, true);
      await seeder.job(deprecated.id, 'In a deprecated Unit');
      const oldStrategy = await seeder.strategy();
      await seeder.job((await seeder.unit(oldStrategy.id, 'Last month')).id, 'In an old Strategy');
      const active = await seeder.job((await seeder.unit(strategy.id, 'Current theme')).id, 'Startable');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id)).toEqual([active.id]);
    });

    it('puts Units with a larger share first, then older Jobs, up to the limit', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const small = await seeder.unit(strategy.id, 'Small', 30);
      const large = await seeder.unit(strategy.id, 'Large', 70);
      await seeder.job(small.id, 'Small first');
      const largeOlder = await seeder.job(large.id, 'Large older');
      const largeNewer = await seeder.job(large.id, 'Large newer');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 2 });

      expect(startable.map((job) => job.id)).toEqual([largeOlder.id, largeNewer.id]);
    });
  });

  describe('listJobsWithActivityOn', () => {
    const today = () => new Date().toISOString().slice(0, 10);
    const namesOn = async (workflowId: string, evaluationDate: string) =>
      (await service.listJobsWithActivityOn({ workflowId, evaluationDate })).map((job) => job.name);

    it('finds Jobs whose Task was reviewed that day, open or closed', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Community engagement');
      const open = await seeder.job(unit.id, 'Still running');
      await seeder.tasks(workflow.id, open.id, ['complete', 'pending']);
      const closed = await seeder.job(unit.id, 'Finished last week', 'success');
      await seeder.tasks(workflow.id, closed.id, ['complete']);
      const untouched = await seeder.job(unit.id, 'Never started');
      await seeder.tasks(workflow.id, untouched.id, ['pending']);

      expect(await namesOn(workflow.id, today())).toEqual(['Still running', 'Finished last week']);
    });

    it('leaves out Jobs spun up to gather evidence for an evaluation', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Community engagement');
      const judged = await seeder.job(unit.id, 'Post an intro');
      await seeder.tasks(workflow.id, judged.id, ['complete']);
      const evidence = await seeder.job(unit.id, 'Read the upvotes');
      await seeder.tasks(workflow.id, evidence.id, ['complete']);
      await dataSource.getRepository(JobEvaluationEntity).save({
        owner: strategy.owner,
        jobId: judged.id,
        unitOfWorkId: unit.id,
        evaluationDate: today(),
        evidenceJobId: evidence.id,
      });

      expect(await namesOn(workflow.id, today())).toEqual(['Post an intro']);
    });

    it('finds nothing on a day with no activity', async () => {
      const { workflow, strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Community engagement');
      const job = await seeder.job(unit.id, 'Post an intro');
      await seeder.tasks(workflow.id, job.id, ['complete']);

      expect(await namesOn(workflow.id, '2026-01-01')).toEqual([]);
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

  describe('placeJob', () => {
    it('files the Job under the Unit with the same name, ignoring case and spaces', async () => {
      const { strategy } = await seeder.strategyWithWorkflow();
      const unit = await seeder.unit(strategy.id, 'Community engagement');

      const job = await service.placeJob({
        strategyId: strategy.id,
        plannedJob: { name: 'Reply to threads', objective: 'Join conversations', unitName: '  community ENGAGEMENT ' },
      });

      expect(job.unitOfWorkId).toBe(unit.id);
      expect(await dataSource.getRepository(UnitOfWorkEntity).count()).toBe(1);
    });

    it('creates a new Unit with a 0% share only when none matches', async () => {
      const { strategy } = await seeder.strategyWithWorkflow();
      await seeder.unit(strategy.id, 'Community engagement', 100);
      await seeder.unit(strategy.id, 'Launch posts', 0, true);

      const job = await service.placeJob({
        strategyId: strategy.id,
        plannedJob: { name: 'Post on Product Hunt', objective: 'Launch', unitName: 'Launch posts' },
      });

      const unit = await dataSource.getRepository(UnitOfWorkEntity).findOneByOrFail({ id: job.unitOfWorkId });
      expect(unit).toEqual(expect.objectContaining({ name: 'Launch posts', allocationPercentage: 0, isDeprecated: false }));
      expect((await service.findJobById(job.id))?.unitOfWork.id).toBe(unit.id);
    });
  });
});
