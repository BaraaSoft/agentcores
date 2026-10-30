import { ApiProperty } from '@nestjs/swagger';
import type { DailyReportEntity } from '../../../../reporting/entities/daily-report.entity';
import { UnitMeasurementResponseDto } from './unit-measurement-response.dto';

/**
 * The owner's daily summary for one Workflow.
 */
export class DailyReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  workflowId: string;

  @ApiProperty({ format: 'date', example: '2026-10-30' })
  reportDate: string;

  @ApiProperty()
  summary: string;

  @ApiProperty({ type: () => [UnitMeasurementResponseDto] })
  unitMeasurements: UnitMeasurementResponseDto[];

  @ApiProperty()
  tasksCompleted: number;

  @ApiProperty()
  tasksFailed: number;

  @ApiProperty()
  openEscalations: number;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: DailyReportEntity): DailyReportResponseDto {
    return Object.assign(new DailyReportResponseDto(), {
      id: entity.id,
      workflowId: entity.workflowId,
      reportDate: entity.reportDate,
      summary: entity.summary,
      unitMeasurements: entity.unitMeasurements.map((measurement) => UnitMeasurementResponseDto.fromMeasurement(measurement)),
      tasksCompleted: entity.tasksCompleted,
      tasksFailed: entity.tasksFailed,
      openEscalations: entity.openEscalations,
      createdAt: entity.createdAt,
    });
  }
}
