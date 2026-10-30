import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EscalationResponseDto } from '../../escalations/dtos/escalation-response.dto';
import { WorkflowEscalationsApiService } from './workflow-escalations-api.service';

/**
 * The escalations of one Workflow that wait on the owner.
 */
@ApiTags('escalations')
@Controller('workflows')
export class WorkflowEscalationsController {
  constructor(private readonly escalations: WorkflowEscalationsApiService) {}

  @Get(':id/escalations')
  @ApiOperation({ summary: 'Escalations waiting on the owner' })
  @ApiOkResponse({ type: [EscalationResponseDto] })
  async listOpenEscalations(@Param('id', ParseUUIDPipe) workflowId: string): Promise<EscalationResponseDto[]> {
    return this.escalations.listOpenEscalations(workflowId);
  }
}
