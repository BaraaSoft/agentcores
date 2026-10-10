import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResolveEscalationRequestDto } from './dtos/resolve-escalation-request.dto';
import type { DailyReportEntity } from './entities/daily-report.entity';
import type { EscalationEntity } from './entities/escalation.entity';
import { ReportingService } from './reporting.service';

const DEFAULT_REPORT_LIMIT = 7;

/**
 * Where the owner reads daily reports and answers escalations.
 */
@ApiTags('reporting')
@Controller()
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('workflows/:id/reports')
  @ApiOperation({ summary: 'Recent daily reports for a Workflow' })
  async listReports(
    @Param('id', ParseUUIDPipe) workflowId: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_REPORT_LIMIT), ParseIntPipe) limit: number,
  ): Promise<DailyReportEntity[]> {
    return this.reporting.listReports(workflowId, limit);
  }

  @Get('workflows/:id/escalations')
  @ApiOperation({ summary: 'Escalations waiting on the owner' })
  async listOpenEscalations(@Param('id', ParseUUIDPipe) workflowId: string): Promise<EscalationEntity[]> {
    return this.reporting.listOpenEscalations(workflowId);
  }

  @Post('escalations/:id/resolve')
  @ApiOperation({ summary: 'Approve or reject an escalated decision' })
  async resolveEscalation(
    @Param('id', ParseUUIDPipe) escalationId: string,
    @Body() body: ResolveEscalationRequestDto,
  ): Promise<EscalationEntity> {
    return this.reporting.resolveEscalation({
      escalationId,
      isApproved: body.isApproved,
      ownerNote: body.ownerNote ?? null,
    });
  }
}
