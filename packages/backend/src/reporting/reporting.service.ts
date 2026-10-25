import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { MetricsService } from '../governance/services/metrics.service';
import { TaskService } from '../governance/services/task.service';
import { JOB_EXECUTION_QUEUE } from '../queue/queue.constants';
import type { JobExecutionJobData } from '../queue/types/job-execution-job-data';
import { DailyReportEntity } from './entities/daily-report.entity';
import { EscalationEntity } from './entities/escalation.entity';
import type { RaiseEscalationInput } from './types/raise-escalation-input';
import type { ResolveEscalationInput } from './types/resolve-escalation-input';

/**
 * Keeps the owner in the loop: builds the daily summary and manages
 * escalations — the points where the agent stops and asks.
 */
@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(DailyReportEntity)
    private readonly reports: Repository<DailyReportEntity>,
    @InjectRepository(EscalationEntity)
    private readonly escalations: Repository<EscalationEntity>,
    private readonly metrics: MetricsService,
    private readonly tasks: TaskService,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
  ) {}

  /**
   * Measures every active Unit for the day and stores the Workflow's daily report.
   * Running it twice for the same date replaces the earlier report.
   */
  async buildDailyReport(workflowId: string, reportDate = new Date()): Promise<DailyReportEntity> {
    throw new NotImplementedException();
  }

  /**
   * Returns the most recent daily reports for a Workflow, newest first.
   */
  async listReports(workflowId: string, limit: number): Promise<DailyReportEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * Parks a decision for the owner and marks the related Task as escalated.
   */
  async raiseEscalation(input: RaiseEscalationInput): Promise<EscalationEntity> {
    throw new NotImplementedException();
  }

  /**
   * Records the owner's answer. Approved: the Task goes back to pending and its Job is queued again,
   * so the Job resumes from that Task. Rejected: the Task is failed and its Job is queued for review,
   * so Job reasoning decides how to continue without it.
   */
  async resolveEscalation(input: ResolveEscalationInput): Promise<EscalationEntity> {
    throw new NotImplementedException();
  }

  /**
   * Escalations still waiting on the owner.
   */
  async listOpenEscalations(workflowId: string): Promise<EscalationEntity[]> {
    throw new NotImplementedException();
  }
}
