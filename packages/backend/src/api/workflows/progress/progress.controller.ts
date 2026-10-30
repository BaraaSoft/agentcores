import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowProgressResponseDto } from './dtos/workflow-progress-response.dto';
import { ProgressApiService } from './progress-api.service';

/**
 * What a Workflow's Strategy has done so far, and how well.
 */
@ApiTags('progress')
@Controller('workflows')
export class ProgressController {
  constructor(private readonly progress: ProgressApiService) {}

  @Get(':id/progress')
  @ApiOperation({ summary: 'The Strategy, its Units of Work, their Jobs, and the evaluation of each Job' })
  @ApiOkResponse({ type: WorkflowProgressResponseDto })
  async getWorkflowProgress(@Param('id', ParseUUIDPipe) workflowId: string): Promise<WorkflowProgressResponseDto> {
    return this.progress.getWorkflowProgress(workflowId);
  }
}
