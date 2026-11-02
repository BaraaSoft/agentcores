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

  @Get()
  @ApiOperation({ summary: 'List every Workflow, newest first' })
  @ApiOkResponse({ type: [WorkflowResponseDto] })
  async listWorkflows(): Promise<WorkflowResponseDto[]> {
    return this.workflows.listWorkflows();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Workflow' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async getWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.getWorkflow(workflowId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start or resume a Workflow (pauses the running one on the machine; a done Workflow is refused)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async startWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.startWorkflow(workflowId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a Workflow and all its work (a running Task stops after its current step)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async pauseWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return this.workflows.pauseWorkflow(workflowId);
  }
}
