import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EscalationResponseDto } from './dtos/escalation-response.dto';
import { ResolveEscalationRequestDto } from './dtos/resolve-escalation-request.dto';
import { EscalationsApiService } from './escalations-api.service';

/**
 * Where the owner answers an escalation.
 */
@ApiTags('escalations')
@Controller('escalations')
export class EscalationsController {
  constructor(private readonly escalations: EscalationsApiService) {}

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Approve or reject an escalated decision' })
  @ApiOkResponse({ type: EscalationResponseDto })
  async resolveEscalation(
    @Param('id', ParseUUIDPipe) escalationId: string,
    @Body() body: ResolveEscalationRequestDto,
  ): Promise<EscalationResponseDto> {
    return this.escalations.resolveEscalation(escalationId, body);
  }
}
