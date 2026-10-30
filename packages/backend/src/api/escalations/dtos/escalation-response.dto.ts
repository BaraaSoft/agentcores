import { ApiProperty } from '@nestjs/swagger';
import type { EscalationEntity } from '../../../reporting/entities/escalation.entity';
import { ESCALATION_STATUSES } from '../../../reporting/types/escalation-status';
import type { EscalationStatus } from '../../../reporting/types/escalation-status';

/**
 * A decision the agent may not make alone, and the owner's answer once given.
 */
export class EscalationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  workflowId: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  taskId: string | null;

  @ApiProperty({ description: 'What the agent wants to do and why it needs a human' })
  question: string;

  @ApiProperty({ enum: ESCALATION_STATUSES })
  status: EscalationStatus;

  @ApiProperty({ type: String, nullable: true })
  ownerNote: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  resolvedAt: Date | null;

  static fromEntity(entity: EscalationEntity): EscalationResponseDto {
    return Object.assign(new EscalationResponseDto(), {
      id: entity.id,
      workflowId: entity.workflowId,
      taskId: entity.taskId,
      question: entity.question,
      status: entity.status,
      ownerNote: entity.ownerNote,
      createdAt: entity.createdAt,
      resolvedAt: entity.resolvedAt,
    });
  }
}
