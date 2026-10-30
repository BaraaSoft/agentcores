import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { JobEntity } from '../../entities/job.entity';
import { UnitOfWorkEntity } from '../../entities/unit-of-work.entity';
import { UnitOfWorkService } from '../unit-of-work.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

describeWithDatabase('UnitOfWorkService (Postgres)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let seeder: GovernanceSeeder;
  let service: UnitOfWorkService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'unit_of_work_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [UnitOfWorkService, GovernanceSeeder],
    }).compile();
    dataSource = moduleRef.get(DataSource);
    seeder = moduleRef.get(GovernanceSeeder);
    service = moduleRef.get(UnitOfWorkService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seeder.clear();
  });

  describe('createUnitOfWork', () => {
    it('opens the Unit with its Jobs, numbering only the ordered ones', async () => {
      const strategy = await seeder.strategy('owner-1', 'one_off');

      const unit = await service.createUnitOfWork({
        strategyId: strategy.id,
        sequence: 1,
        name: 'Attempt 1',
        title: 'One clean cut',
        rationale: 'Start simple.',
        jobs: [
          { name: 'Cut', objective: 'Cut the footage', orderType: 'ordered' },
          { name: 'Music', objective: 'Pick a track', orderType: 'unordered' },
          { name: 'Export', objective: 'Export the video', orderType: 'ordered' },
        ],
      });

      expect(unit).toMatchObject({
        sequence: 1,
        name: 'Attempt 1',
        title: 'One clean cut',
        rationale: 'Start simple.',
        status: 'open',
        state: 'running',
        evaluateAfter: null,
      });
      const jobs = await dataSource.getRepository(JobEntity).find({ where: { unitOfWorkId: unit.id }, order: { name: 'ASC' } });
      expect(jobs.map((job) => [job.name, job.orderType, job.orderNumber])).toEqual([
        ['Cut', 'ordered', 1],
        ['Export', 'ordered', 2],
        ['Music', 'unordered', null],
      ]);
    });

    it('refuses a second Unit with the same number and saves none of its Jobs', async () => {
      const strategy = await seeder.strategy();
      await seeder.unit(strategy.id, 'Round 1');

      await expect(
        service.createUnitOfWork({
          strategyId: strategy.id,
          sequence: 1,
          name: 'Round 1 again',
          title: '',
          rationale: '',
          jobs: [{ name: 'Post', objective: 'Post', orderType: 'unordered' }],
        }),
      ).rejects.toThrow();
      expect(await dataSource.getRepository(JobEntity).count()).toBe(0);
    });
  });

  describe('the status a Unit moves through', () => {
    it('moves open → evaluating → complete, each only once', async () => {
      const strategy = await seeder.strategy();
      const unit = await seeder.unit(strategy.id, 'Round 1');
      const evaluateAfter = new Date('2026-10-30T10:00:00Z');

      expect(await service.markComplete(unit.id)).toBe(false);
      expect(await service.markEvaluating(unit.id, evaluateAfter)).toBe(true);
      expect(await service.markEvaluating(unit.id, new Date())).toBe(false);
      expect(await dataSource.getRepository(UnitOfWorkEntity).findOneByOrFail({ id: unit.id })).toMatchObject({
        status: 'evaluating',
        evaluateAfter,
      });
      expect(await service.markComplete(unit.id)).toBe(true);
      expect(await service.markComplete(unit.id)).toBe(false);
    });

    it('lists the evaluating Units whose wait is over, oldest first', async () => {
      const strategy = await seeder.strategy();
      const now = new Date('2026-10-30T10:00:00Z');
      const due = await seeder.unit(strategy.id, 'Round 1', { status: 'evaluating', evaluateAfter: new Date('2026-10-29T10:00:00Z') });
      await seeder.unit(strategy.id, 'Round 2', { status: 'evaluating', evaluateAfter: new Date('2026-10-31T10:00:00Z') });
      const dueNow = await seeder.unit(strategy.id, 'Round 3', { status: 'evaluating', evaluateAfter: now });
      await seeder.unit(strategy.id, 'Round 4');

      const found = await service.listUnitsOfWorkDueForEvaluation(strategy.id, now);

      expect(found.map((unit) => unit.id)).toEqual([due.id, dueNow.id]);
    });
  });
});
