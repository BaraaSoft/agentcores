import { WORKFLOW_STATES } from '@ahe/agent-core';
import type { WorkflowState } from '@ahe/agent-core';
import { ApiProperty } from '@nestjs/swagger';
import { StrategyResponseDto } from '../../../strategies/dtos/strategy-response.dto';
import { UnitOfWorkProgressResponseDto } from './unit-of-work-progress-response.dto';

/**
 * Response of `GET /workflows/:id/progress`: the Strategy, then every Unit of Work oldest first, each
 * with its Jobs, their outcomes, and their evaluations.
 */
export class WorkflowProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  workflowId: string;

  @ApiProperty({ enum: WORKFLOW_STATES })
  workflowState: WorkflowState;

  @ApiProperty({ type: () => StrategyResponseDto })
  strategy: StrategyResponseDto;

  @ApiProperty({ type: () => [UnitOfWorkProgressResponseDto] })
  unitsOfWork: UnitOfWorkProgressResponseDto[];
}
