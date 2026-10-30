import { UNIT_OF_WORK_STATUSES } from '@ahe/agent-core';
import type { UnitOfWorkStatus } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { UnitOfWorkEntity } from '../../../../governance/entities/unit-of-work.entity';
import { JobProgressResponseDto } from './job-progress-response.dto';

/**
 * One round, attempt, or version of the Strategy, with its Jobs.
 */
export class UnitOfWorkProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: '1 for the first Unit of Work, then 2, 3, …' })
  sequence: number;

  @ApiProperty({ example: 'Attempt 2' })
  name: string;

  @ApiProperty({ example: 'Shorter hook, post at 9am instead of 3am', description: 'The idea this Unit of Work tests' })
  title: string;

  @ApiProperty({ description: 'Why the agent chose that idea, given what the earlier Units of Work taught' })
  rationale: string;

  @ApiProperty({ enum: UNIT_OF_WORK_STATUSES })
  status: UnitOfWorkStatus;

  @ApiProperty({ type: Date, nullable: true, description: 'When its Jobs may be evaluated; set when the last Job closes' })
  evaluateAfter: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: () => [JobProgressResponseDto] })
  jobs: JobProgressResponseDto[];

  static fromEntity(entity: UnitOfWorkEntity, jobs: JobProgressResponseDto[]): UnitOfWorkProgressResponseDto {
    return Object.assign(new UnitOfWorkProgressResponseDto(), {
      id: entity.id,
      sequence: entity.sequence,
      name: entity.name,
      title: entity.title,
      rationale: entity.rationale,
      status: entity.status,
      evaluateAfter: entity.evaluateAfter,
      createdAt: entity.createdAt,
      jobs,
    });
  }
}
