import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceModule } from '../governance/governance.module';
import { DAILY_REPORT_QUEUE, JOB_EXECUTION_QUEUE } from '../queue/queue.constants';
import { DailyReportEntity } from './entities/daily-report.entity';
import { EscalationEntity } from './entities/escalation.entity';
import { DailyReportProcessor } from './processors/daily-report.processor';
import { ReportingService } from './reporting.service';

/**
 * Daily reports and escalations — the owner's view into what the agent is doing. Its routes live in
 * `ApiModule`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DailyReportEntity, EscalationEntity]),
    BullModule.registerQueue({ name: DAILY_REPORT_QUEUE }, { name: JOB_EXECUTION_QUEUE }),
    GovernanceModule,
  ],
  providers: [ReportingService, DailyReportProcessor],
  exports: [ReportingService],
})
export class ReportingModule {}
