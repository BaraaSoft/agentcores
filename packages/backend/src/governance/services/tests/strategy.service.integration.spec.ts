import { Test, TestingModule } from '@nestjs/testing';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { DEFAULT_MAX_ATTEMPTS, StrategyService } from '../strategy.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

describeWithDatabase('StrategyService (Postgres)', () => {
  let moduleRef: TestingModule;
  let seeder: GovernanceSeeder;
  let service: StrategyService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'strategy_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [StrategyService, GovernanceSeeder],
    }).compile();
    seeder = moduleRef.get(GovernanceSeeder);
    service = moduleRef.get(StrategyService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seeder.clear();
  });

  const base = { owner: 'owner-1', name: 'Launch video', objective: 'A 60-second launch video for AHE' };

  it('saves a Strategy with the default attempts', async () => {
    const strategy = await service.createStrategy({ ...base, workType: 'one_off' });

    expect(strategy).toMatchObject({
      workType: 'one_off',
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      versionCount: null,
    });
  });

  it('keeps the version count only for multi_version, and requires it there', async () => {
    expect((await service.createStrategy({ ...base, workType: 'multi_version', versionCount: 3 })).versionCount).toBe(3);
    expect((await service.createStrategy({ ...base, workType: 'continuous', versionCount: 3 })).versionCount).toBeNull();
    await expect(service.createStrategy({ ...base, workType: 'multi_version' })).rejects.toThrow('versionCount');
  });
});
