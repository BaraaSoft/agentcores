import { STRATEGY_STATUSES, STRATEGY_WORK_TYPES } from '@ahe/agent-core';
import type { StrategyStatus, StrategyWorkType } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { StrategyEntity } from '../../../governance/entities/strategy.entity';

/**
 * Public shape of a Strategy: its objective, how the work repeats, and whether it is done. Returned by
 * the Strategy routes and inside the Workflow progress.
 */
export class StrategyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  objective: string;

  @ApiProperty({ enum: STRATEGY_WORK_TYPES })
  workType: StrategyWorkType;

  @ApiProperty({ type: Number, nullable: true, description: 'How many versions a multi_version Strategy makes' })
  versionCount: number | null;

  @ApiProperty({ description: 'Most attempts a one_off Strategy makes' })
  maxAttempts: number;

  @ApiProperty({ enum: STRATEGY_STATUSES })
  status: StrategyStatus;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ type: Date, nullable: true, description: 'When the Strategy completed' })
  endDate: Date | null;

  static fromEntity(entity: StrategyEntity): StrategyResponseDto {
    return Object.assign(new StrategyResponseDto(), {
      id: entity.id,
      name: entity.name,
      objective: entity.objective,
      workType: entity.workType,
      versionCount: entity.versionCount,
      maxAttempts: entity.maxAttempts,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
    });
  }
}
