import { NotFoundException } from '@nestjs/common';
import type { StrategyService } from '../../../governance/services/strategy.service';
import { StrategyResponseDto } from '../dtos/strategy-response.dto';
import { StrategiesApiService } from '../strategies-api.service';

const START = new Date('2026-10-30T10:00:00Z');
const STRATEGY = {
  id: 'strategy-1',
  owner: 'owner-1',
  name: 'Launch video',
  objective: 'A 60-second launch video',
  workType: 'one_off',
  versionCount: null,
  maxAttempts: 3,
  status: 'active',
  startDate: START,
  endDate: null,
  goldStandards: null,
  evaluation: null,
};

function setup(found: unknown = STRATEGY) {
  const strategies = {
    createStrategy: jest.fn().mockResolvedValue(STRATEGY),
    findStrategyById: jest.fn().mockResolvedValue(found),
    listStrategies: jest.fn().mockResolvedValue([STRATEGY]),
  };
  const service = new StrategiesApiService(strategies as unknown as StrategyService);
  return { service, strategies };
}

describe('StrategiesApiService', () => {
  it('creates a Strategy and returns only the public fields', async () => {
    const t = setup();
    const body = { owner: 'owner-1', name: 'Launch video', objective: 'A 60-second launch video', workType: 'one_off' as const };

    const created = await t.service.createStrategy(body);

    expect(t.strategies.createStrategy).toHaveBeenCalledWith(body);
    expect(created).toBeInstanceOf(StrategyResponseDto);
    expect(created).toEqual({
      id: 'strategy-1',
      name: 'Launch video',
      objective: 'A 60-second launch video',
      workType: 'one_off',
      versionCount: null,
      maxAttempts: 3,
      status: 'active',
      startDate: START,
      endDate: null,
    });
  });

  it('lists the Strategies with only the public fields', async () => {
    const listed = await setup().service.listStrategies();

    expect(listed).toHaveLength(1);
    expect(listed[0]).toBeInstanceOf(StrategyResponseDto);
    expect(listed[0]).not.toHaveProperty('owner');
    expect(listed[0]).toMatchObject({ id: 'strategy-1', name: 'Launch video' });
  });

  it('gets a Strategy, and answers 404 when it does not exist', async () => {
    expect(await setup().service.getStrategy('strategy-1')).toMatchObject({ id: 'strategy-1' });
    await expect(setup(null).service.getStrategy('strategy-x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
