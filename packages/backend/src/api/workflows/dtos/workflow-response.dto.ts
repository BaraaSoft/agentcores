import { WORKFLOW_STATES } from '@ahe/agent-core';
import type { WorkflowResources, WorkflowState } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { WorkflowEntity } from '../../../workflow/entities/workflow.entity';

/**
 * Public shape of a Workflow, returned by the create, get, start, and pause routes.
 */
export class WorkflowResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  strategyId: string;

  @ApiProperty()
  machineId: string;

  @ApiProperty({ enum: WORKFLOW_STATES })
  state: WorkflowState;

  @ApiProperty()
  resources: WorkflowResources;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ description: 'When the Workflow last changed, such as a start or a pause' })
  updatedAt: Date;

  /**
   * Maps a persisted Workflow to its API representation.
   */
  static fromEntity(entity: WorkflowEntity): WorkflowResponseDto {
    return Object.assign(new WorkflowResponseDto(), {
      id: entity.id,
      strategyId: entity.strategyId,
      machineId: entity.machineId,
      state: entity.state,
      resources: entity.resources,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
