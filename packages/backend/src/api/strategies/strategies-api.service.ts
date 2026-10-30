import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategyService } from '../../governance/services/strategy.service';
import type { CreateStrategyRequestDto } from './dtos/create-strategy-request.dto';
import { StrategyResponseDto } from './dtos/strategy-response.dto';

/**
 * The Strategy routes' bridge to `StrategyService`. Maps every result to `StrategyResponseDto`.
 */
@Injectable()
export class StrategiesApiService {
  constructor(private readonly strategies: StrategyService) {}

  async createStrategy(body: CreateStrategyRequestDto): Promise<StrategyResponseDto> {
    return StrategyResponseDto.fromEntity(await this.strategies.createStrategy(body));
  }

  async getStrategy(strategyId: string): Promise<StrategyResponseDto> {
    const strategy = await this.strategies.findStrategyById(strategyId);
    if (strategy === null) throw new NotFoundException(`Strategy ${strategyId} not found`);
    return StrategyResponseDto.fromEntity(strategy);
  }
}
