import { TASK_SKILL_TYPES, TASK_STATUSES } from '@ahe/agent-core';
import type { TaskSkillType, TaskStatus } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { TaskEntity } from '../../../../governance/entities/task.entity';

/**
 * One Task of a Job: what it does, where it stands, and what it left behind.
 */
export class TaskProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Order within the Job, from 1' })
  sequence: number;

  @ApiProperty()
  action: string;

  @ApiProperty({ enum: TASK_SKILL_TYPES })
  skillType: TaskSkillType;

  @ApiProperty({ enum: TASK_STATUSES })
  status: TaskStatus;

  @ApiProperty({ type: String, nullable: true, description: 'What the finished Task reported' })
  summary: string | null;

  @ApiProperty({ type: String, nullable: true })
  failureReason: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Where the work was done: a link, a file path, or an app' })
  locationPath: string | null;

  @ApiProperty({ type: Date, nullable: true })
  startedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  completedAt: Date | null;

  static fromEntity(entity: TaskEntity): TaskProgressResponseDto {
    return Object.assign(new TaskProgressResponseDto(), {
      id: entity.id,
      sequence: entity.sequence,
      action: entity.action,
      skillType: entity.skillType,
      status: entity.status,
      summary: entity.result?.summary ?? null,
      failureReason: entity.failureReason,
      locationPath: entity.locationPath,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
    });
  }
}
