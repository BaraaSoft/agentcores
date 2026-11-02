import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowResponseDto } from '../workflows/dtos/workflow-response.dto';
import { WorkflowsApiService } from '../workflows/workflows-api.service';
import { CreateStrategyRequestDto } from './dtos/create-strategy-request.dto';
import { RunStrategyRequestDto } from './dtos/run-strategy-request.dto';
import { StrategyResponseDto } from './dtos/strategy-response.dto';
import { StrategiesApiService } from './strategies-api.service';

/**
 * Create, read, and run Strategies. A Strategy is a reusable goal; each run of it is a Workflow.
 */
@ApiTags('strategies')
@Controller('strategies')
export class StrategiesController {
  constructor(
    private readonly strategies: StrategiesApiService,
    private readonly workflows: WorkflowsApiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a Strategy (then create and start a Workflow to run it)' })
  @ApiCreatedResponse({ type: StrategyResponseDto })
  async createStrategy(@Body() body: CreateStrategyRequestDto): Promise<StrategyResponseDto> {
    return this.strategies.createStrategy(body);
  }

  @Get()
  @ApiOperation({ summary: 'List every Strategy, newest first' })
  @ApiOkResponse({ type: [StrategyResponseDto] })
  async listStrategies(): Promise<StrategyResponseDto[]> {
    return this.strategies.listStrategies();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Strategy' })
  @ApiOkResponse({ type: StrategyResponseDto })
  async getStrategy(@Param('id', ParseUUIDPipe) strategyId: string): Promise<StrategyResponseDto> {
    return this.strategies.getStrategy(strategyId);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run a Strategy again: a fresh Workflow that pauses the running one and starts at once' })
  @ApiCreatedResponse({ type: WorkflowResponseDto })
  async runStrategy(@Param('id', ParseUUIDPipe) strategyId: string, @Body() body: RunStrategyRequestDto): Promise<WorkflowResponseDto> {
    return this.workflows.runStrategy(strategyId, body);
  }
}
