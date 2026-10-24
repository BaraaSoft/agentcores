import type { TaskStatus } from '@ahe/agent-core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
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
    async function workflowWithJobs(jobs: Record<string, readonly TaskStatus[]>) {
      const { workflow, strategy } = await seeder.workflowWithActiveStrategy();
      const unit = await seeder.unit(strategy.id, 'Community engagement');
      const ids: Record<string, string> = {};
      for (const [name, statuses] of Object.entries(jobs)) {
        const job = await seeder.job(unit.id, name);
        await seeder.tasks(workflow.id, job.id, statuses);
        ids[name] = job.id;
      }
      return { workflow, strategy, ids };
    }

    it('starts new Jobs and Jobs whose current Task is pending, and nothing else', async () => {
      const { workflow, ids } = await workflowWithJobs({
        new: [],
        ready: ['complete', 'pending', 'pending'],
        running: ['complete', 'running', 'pending'],
        deferred: ['deferred', 'pending'],
        escalated: ['escalated', 'pending'],
        failed: ['complete', 'failed', 'pending'],
        done: ['complete', 'complete'],
      });

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id).sort()).toEqual([ids.new, ids.ready].sort());
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
      });

      expect(await service.countActiveJobs(workflow.id)).toBe(3);
    });

    it('skips deprecated Units and Strategies that are not active', async () => {
      const { workflow, strategy } = await seeder.workflowWithActiveStrategy();
      const deprecated = await seeder.unit(strategy.id, 'Old theme', 0, true);
      await seeder.job(deprecated.id, 'In a deprecated Unit');
      const oldStrategy = await seeder.strategy(workflow.id);
      await seeder.job((await seeder.unit(oldStrategy.id, 'Last month')).id, 'In an old Strategy');
      const active = await seeder.job((await seeder.unit(strategy.id, 'Current theme')).id, 'Startable');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 10 });

      expect(startable.map((job) => job.id)).toEqual([active.id]);
    });

    it('puts Units with a larger share first, then older Jobs, up to the limit', async () => {
      const { workflow, strategy } = await seeder.workflowWithActiveStrategy();
      const small = await seeder.unit(strategy.id, 'Small', 30);
      const large = await seeder.unit(strategy.id, 'Large', 70);
      await seeder.job(small.id, 'Small first');
      const largeOlder = await seeder.job(large.id, 'Large older');
      const largeNewer = await seeder.job(large.id, 'Large newer');

      const startable = await service.listStartableJobs({ workflowId: workflow.id, limit: 2 });

      expect(startable.map((job) => job.id)).toEqual([largeOlder.id, largeNewer.id]);
    });
  });

  describe('placeJob', () => {
    it('files the Job under the Unit with the same name, ignoring case and spaces', async () => {
      const { strategy } = await seeder.workflowWithActiveStrategy();
      const unit = await seeder.unit(strategy.id, 'Community engagement');

      const job = await service.placeJob({
        strategyId: strategy.id,
        plannedJob: { name: 'Reply to threads', objective: 'Join conversations', unitName: '  community ENGAGEMENT ' },
      });

      expect(job.unitOfWorkId).toBe(unit.id);
      expect(await dataSource.getRepository(UnitOfWorkEntity).count()).toBe(1);
    });

    it('creates a new Unit with a 0% share only when none matches', async () => {
      const { strategy } = await seeder.workflowWithActiveStrategy();
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
