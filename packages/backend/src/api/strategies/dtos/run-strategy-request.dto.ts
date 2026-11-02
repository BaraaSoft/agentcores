import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, Length, ValidateNested } from 'class-validator';
import { WorkflowResourcesRequestDto } from '../../workflows/dtos/workflow-resources-request.dto';

/**
 * Body for `POST /strategies/:id/run`: where the fresh run happens and what it may use.
 */
export class RunStrategyRequestDto {
  @ApiProperty({ example: 'Macbook', description: 'The machine the new run works on' })
  @IsString()
  @Length(1, 100)
  machineId: string;

  @ApiProperty({ type: WorkflowResourcesRequestDto })
  @ValidateNested()
  @Type(() => WorkflowResourcesRequestDto)
  resources: WorkflowResourcesRequestDto;
}
