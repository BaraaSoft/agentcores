import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { WorkflowResourcesRequestDto } from './workflow-resources-request.dto';

/**
 * Body for `POST /workflows`. A new Workflow runs one Strategy on one machine, and starts `paused`.
 */
export class CreateWorkflowRequestDto {
  @ApiProperty({ format: 'uuid', description: 'The Strategy this machine runs' })
  @IsUUID()
  strategyId: string;

  @ApiProperty({ example: 'baraa-macbook', description: 'The machine this Workflow runs on' })
  @IsString()
  @Length(1, 100)
  machineId: string;

  @ApiProperty({ type: WorkflowResourcesRequestDto })
  @ValidateNested()
  @Type(() => WorkflowResourcesRequestDto)
  resources: WorkflowResourcesRequestDto;
}
