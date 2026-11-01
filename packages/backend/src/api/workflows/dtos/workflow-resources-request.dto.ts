import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

const MAX_CONCURRENT_JOBS_LIMIT = 10;

/**
 * Resource envelope supplied when a Workflow is created.
 */
export class WorkflowResourcesRequestDto {
  @ApiProperty({ minimum: 1, maximum: MAX_CONCURRENT_JOBS_LIMIT })
  @IsInt()
  @Min(1)
  @Max(MAX_CONCURRENT_JOBS_LIMIT)
  maxConcurrentJobs: number;

  @ApiProperty({ description: 'Monthly spend ceiling in USD', example: 500 })
  @IsNumber()
  @Min(0)
  budgetLimit: number;
}
