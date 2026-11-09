import { STRATEGY_WORK_TYPES } from '@agentcores/agent-core';
import type { StrategyWorkType } from '@agentcores/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { StrategyEntity } from '../../../governance/entities/strategy.entity';

/**
 * Public shape of a Strategy: a reusable goal and how its work repeats. Whether a run is finished is
 * the Workflow's `state`. Returned by the Strategy routes and inside the Workflow progress.
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

  @ApiProperty()
  startDate: Date;

  static fromEntity(entity: StrategyEntity): StrategyResponseDto {
    return Object.assign(new StrategyResponseDto(), {
      id: entity.id,
      name: entity.name,
      objective: entity.objective,
      workType: entity.workType,
      versionCount: entity.versionCount,
      maxAttempts: entity.maxAttempts,
      startDate: entity.startDate,
    });
  }
}
