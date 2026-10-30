import { Injectable } from '@nestjs/common';
import { ReportingService } from '../../../reporting/reporting.service';
import { DailyReportResponseDto } from './dtos/daily-report-response.dto';

/**
 * The daily-report route's bridge to `ReportingService`.
 */
@Injectable()
export class ReportsApiService {
  constructor(private readonly reporting: ReportingService) {}

  async listReports(workflowId: string, limit: number): Promise<DailyReportResponseDto[]> {
    const reports = await this.reporting.listReports(workflowId, limit);
    return reports.map((report) => DailyReportResponseDto.fromEntity(report));
  }
}
