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

  @ApiProperty()
  name: string;

  @ApiProperty()
  owner: string;

  @ApiProperty({ enum: WORKFLOW_STATES })
  state: WorkflowState;

  @ApiProperty()
  resources: WorkflowResources;

  @ApiProperty({ format: 'uuid', nullable: true })
  activeStrategyId: string | null;

  /**
   * Maps a persisted Workflow to its API representation.
   */
  static fromEntity(entity: WorkflowEntity): WorkflowResponseDto {
    throw new Error('Not implemented');
  }
}
