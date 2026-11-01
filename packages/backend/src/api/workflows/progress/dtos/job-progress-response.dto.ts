import { JOB_ORDER_TYPES, JOB_OUTCOME_STATUSES } from '@ahe/agent-core';
import type { JobOrderType, JobOutcomeStatus } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { JobEntity } from '../../../../governance/entities/job.entity';
import type { JobEvaluationEntity } from '../../../../governance/entities/job-evaluation.entity';
import type { TaskEntity } from '../../../../governance/entities/task.entity';
import { JobEvaluationResponseDto } from './job-evaluation-response.dto';
import { TaskProgressResponseDto } from './task-progress-response.dto';

/**
 * One Job of a Unit of Work: what it set out to do, its Tasks, how it ended, and how it was evaluated.
 */
export class JobProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  objective: string;

  @ApiProperty({ enum: JOB_ORDER_TYPES })
  orderType: JobOrderType;

  @ApiProperty({ type: Number, nullable: true, description: 'Position among the ordered Jobs, from 1' })
  orderNumber: number | null;

  @ApiProperty({ enum: JOB_OUTCOME_STATUSES, nullable: true, description: 'Null while the Job is open' })
  outcomeStatus: JobOutcomeStatus | null;

  @ApiProperty({ type: String, nullable: true, description: 'What was achieved, or why the Job stopped' })
  outcomeSummary: string | null;

  @ApiProperty({ type: Date, nullable: true })
  closedAt: Date | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: () => JobEvaluationResponseDto, nullable: true, description: 'Null until the evaluation opens' })
  evaluation: JobEvaluationResponseDto | null;

  @ApiProperty({ type: () => [TaskProgressResponseDto], description: 'Every Task of the Job, in sequence order' })
  tasks: TaskProgressResponseDto[];

  static fromEntity(
    entity: JobEntity,
    evaluation: JobEvaluationEntity | undefined,
    tasks: readonly TaskEntity[],
  ): JobProgressResponseDto {
    return Object.assign(new JobProgressResponseDto(), {
      id: entity.id,
      name: entity.name,
      objective: entity.objective,
      orderType: entity.orderType,
      orderNumber: entity.orderNumber,
      outcomeStatus: entity.outcomeStatus,
      outcomeSummary: entity.outcomeSummary,
      closedAt: entity.closedAt,
      createdAt: entity.createdAt,
      evaluation: evaluation === undefined ? null : JobEvaluationResponseDto.fromEntity(evaluation),
      tasks: tasks.map((task) => TaskProgressResponseDto.fromEntity(task)),
    });
  }
}
