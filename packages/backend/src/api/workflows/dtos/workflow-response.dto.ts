import { WORKFLOW_STATES } from '@agentcores/agent-core';
import type { WorkflowResources, WorkflowState } from '@agentcores/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { WorkflowEntity } from '../../../workflow/entities/workflow.entity';

/**
 * Public shape of a Workflow — one run of a Strategy — returned by the create, list, get, start,
 * pause, and run routes.
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

  @ApiProperty({ description: 'Tasks running on the machine now. A paused Workflow with none has freed the machine.' })
  activeTaskCount: number;

  /**
   * Maps a persisted Workflow to its API representation.
   */
  static fromEntity(entity: WorkflowEntity, activeTaskCount = 0): WorkflowResponseDto {
    return Object.assign(new WorkflowResponseDto(), {
      id: entity.id,
      strategyId: entity.strategyId,
      machineId: entity.machineId,
      state: entity.state,
      resources: entity.resources,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      activeTaskCount,
    });
  }
}
