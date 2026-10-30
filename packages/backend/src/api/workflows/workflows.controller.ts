import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateWorkflowRequestDto } from './dtos/create-workflow-request.dto';
import { WorkflowResponseDto } from './dtos/workflow-response.dto';
import { WorkflowsApiService } from './workflows-api.service';

/**
 * Create, read, start, and pause Workflows.
 */
@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsApiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Workflow (starts paused)' })
  @ApiCreatedResponse({ type: WorkflowResponseDto })
  async createWorkflow(@Body() body: CreateWorkflowRequestDto): Promise<WorkflowResponseDto> {
    return this.workflows.createWorkflow(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Workflow' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async getWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.getWorkflow(workflowId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a Workflow (its Strategy gets its first Unit of Work on the next pass)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async startWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.startWorkflow(workflowId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a Workflow (running Tasks finish)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async pauseWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.pauseWorkflow(workflowId);
  }
}
