import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceModule } from '../governance/governance.module';
import { DAILY_REPORT_QUEUE } from '../queue/queue.constants';
import { DailyReportEntity } from './entities/daily-report.entity';
import { EscalationEntity } from './entities/escalation.entity';
import { DailyReportProcessor } from './processors/daily-report.processor';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

/**
 * Daily reports and escalations — the owner's view into what the agent is doing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DailyReportEntity, EscalationEntity]),
    BullModule.registerQueue({ name: DAILY_REPORT_QUEUE }),
    GovernanceModule,
  ],
  controllers: [ReportingController],
  providers: [ReportingService, DailyReportProcessor],
  exports: [ReportingService],
})
export class ReportingModule {}
