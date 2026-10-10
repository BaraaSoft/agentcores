import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateWorkflowRequestDto } from './dtos/create-workflow-request.dto';
import { WorkflowResponseDto } from './dtos/workflow-response.dto';
import { WorkflowService } from './workflow.service';

/**
 * Create and inspect Workflows. Starting and pausing lives on the orchestrator routes.
 */
@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Workflow (starts paused)' })
  @ApiCreatedResponse({ type: WorkflowResponseDto })
  async createWorkflow(@Body() body: CreateWorkflowRequestDto): Promise<WorkflowResponseDto> {
    return WorkflowResponseDto.fromEntity(await this.workflows.createWorkflow(body));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Workflow' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async getWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (!workflow) throw new NotFoundException(`Workflow ${workflowId} not found`);
    return WorkflowResponseDto.fromEntity(workflow);
  }
}
