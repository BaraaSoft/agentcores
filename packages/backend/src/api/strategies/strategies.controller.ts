import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStrategyRequestDto } from './dtos/create-strategy-request.dto';
import { StrategyResponseDto } from './dtos/strategy-response.dto';
import { StrategiesApiService } from './strategies-api.service';

/**
 * Create and read Strategies. A Strategy runs once a Workflow for it is created and started.
 */
@ApiTags('strategies')
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategies: StrategiesApiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Strategy (then create and start a Workflow to run it)' })
  @ApiCreatedResponse({ type: StrategyResponseDto })
  async createStrategy(@Body() body: CreateStrategyRequestDto): Promise<StrategyResponseDto> {
    return this.strategies.createStrategy(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Strategy' })
  @ApiOkResponse({ type: StrategyResponseDto })
  async getStrategy(@Param('id', ParseUUIDPipe) strategyId: string): Promise<StrategyResponseDto> {
    return this.strategies.getStrategy(strategyId);
  }
}
