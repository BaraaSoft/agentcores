import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DailyReportResponseDto } from './dtos/daily-report-response.dto';
import { ListReportsRequestDto } from './dtos/list-reports-request.dto';
import { ReportsApiService } from './reports-api.service';

/**
 * Where the owner reads a Workflow's daily reports.
 */
@ApiTags('reports')
@Controller('workflows')
export class ReportsController {
  constructor(private readonly reports: ReportsApiService) {}

  @Get(':id/reports')
  @ApiOperation({ summary: 'Recent daily reports for a Workflow' })
  @ApiOkResponse({ type: [DailyReportResponseDto] })
  async listReports(
    @Param('id', ParseUUIDPipe) workflowId: string,
    @Query() query: ListReportsRequestDto,
  ): Promise<DailyReportResponseDto[]> {
    return this.reports.listReports(workflowId, query.limit);
  }
}
