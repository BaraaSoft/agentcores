import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { LoggedWorkerHost } from '../../queue/logged-worker-host';
import { DAILY_REPORT_QUEUE } from '../../queue/queue.constants';
import type { WorkflowJobData } from '../../queue/types/workflow-job-data';
import { ReportingService } from '../reporting.service';

/**
 * Worker for the daily pass: measure Units, write the report.
 * Scheduled once a day per running Workflow by the orchestrator.
 */
@Processor(DAILY_REPORT_QUEUE)
export class DailyReportProcessor extends LoggedWorkerHost {
  constructor(private readonly reporting: ReportingService) {
    super();
  }

  /**
   * Builds today's report for the Workflow.
   */
  async process(message: Job<WorkflowJobData>): Promise<void> {
    throw new Error('Not implemented');
  }
}
