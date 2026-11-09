import { STRATEGY_WORK_TYPES } from '@agentcores/agent-core';
import type { StrategyWorkType } from '@agentcores/agent-core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

const MAX_OBJECTIVE_LENGTH = 5_000;
const MAX_VERSION_COUNT = 10;
const MAX_ATTEMPTS_LIMIT = 10;

/**
 * Body for `POST /strategies`. The Strategy starts `active`; it runs once a Workflow for it is started.
 */
export class CreateStrategyRequestDto {
  @ApiProperty({ example: 'user-123', description: 'HumanExperiences user ID of the person the Strategy acts for' })
  @IsString()
  @Length(1, 100)
  owner: string;

  @ApiProperty({ example: 'Launch video' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ example: 'A 60-second launch video for AHE, exported at 1080p to ~/Movies/AHE', description: 'The outcome, in the owner\'s words' })
  @IsString()
  @Length(1, MAX_OBJECTIVE_LENGTH)
  objective: string;

  @ApiProperty({ enum: STRATEGY_WORK_TYPES, description: 'How the work repeats: rounds, attempts, or versions' })
  @IsIn(STRATEGY_WORK_TYPES)
  workType: StrategyWorkType;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_VERSION_COUNT, description: 'Required for multi_version: how many versions to make' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_VERSION_COUNT)
  versionCount?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_ATTEMPTS_LIMIT, default: 3, description: 'For one_off: most attempts before it stops' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ATTEMPTS_LIMIT)
  maxAttempts?: number;
}
