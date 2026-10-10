import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowResponseDto } from '../workflow/dtos/workflow-response.dto';
import { OrchestratorService } from './orchestrator.service';

/**
 * Start and pause Workflows.
 */
@ApiTags('orchestrator')
@Controller('workflows')
export class OrchestratorController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a Workflow (plans a Strategy if it has none)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async startWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return WorkflowResponseDto.fromEntity(await this.orchestrator.startWorkflow(workflowId));
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a Workflow (running Tasks finish)' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async pauseWorkflow(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowResponseDto> {
    return WorkflowResponseDto.fromEntity(await this.orchestrator.pauseWorkflow(workflowId));
  }
}
