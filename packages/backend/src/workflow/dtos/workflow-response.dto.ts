import { WORKFLOW_STATES } from '@ahe/agent-core';
import type { WorkflowResources, WorkflowState } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import type { WorkflowEntity } from '../entities/workflow.entity';

/**
 * Public shape of a Workflow returned by the API.
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
    });
  }
}
