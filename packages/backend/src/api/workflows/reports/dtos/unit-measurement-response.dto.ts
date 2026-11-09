import type { UnitMeasurement } from '@agentcores/agent-core';
import { ApiProperty } from '@nestjs/swagger';

/**
 * How one Unit of Work tracked against its criteria over the report's period.
 */
export class UnitMeasurementResponseDto {
  @ApiProperty({ format: 'uuid' })
  unitOfWorkId: string;

  @ApiProperty()
  unitName: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' }, description: 'Value per metric key' })
  values: Record<string, number>;

  @ApiProperty()
  isMeetingCriteria: boolean;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  static fromMeasurement(measurement: UnitMeasurement): UnitMeasurementResponseDto {
    return Object.assign(new UnitMeasurementResponseDto(), {
      unitOfWorkId: measurement.unitOfWorkId,
      unitName: measurement.unitName,
      values: { ...measurement.values },
      isMeetingCriteria: measurement.isMeetingCriteria,
      periodStart: measurement.periodStart,
      periodEnd: measurement.periodEnd,
    });
  }
}
