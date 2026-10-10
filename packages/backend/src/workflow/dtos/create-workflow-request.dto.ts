import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, Length, ValidateNested } from 'class-validator';
import { WorkflowResourcesRequestDto } from './workflow-resources-request.dto';

/**
 * Body for `POST /workflows`. A new Workflow starts `paused` with no Strategy.
 */
export class CreateWorkflowRequestDto {
  @ApiProperty({ example: 'HumanExperiences distribution' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'HumanExperiences user ID' })
  @IsString()
  @Length(1, 100)
  owner: string;

  @ApiProperty({ type: WorkflowResourcesRequestDto })
  @ValidateNested()
  @Type(() => WorkflowResourcesRequestDto)
  resources: WorkflowResourcesRequestDto;
}
