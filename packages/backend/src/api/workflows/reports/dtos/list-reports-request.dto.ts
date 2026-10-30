import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_REPORT_LIMIT = 7;
const MAX_REPORT_LIMIT = 90;

/**
 * Query for `GET /workflows/:id/reports`.
 */
export class ListReportsRequestDto {
  @ApiPropertyOptional({ default: DEFAULT_REPORT_LIMIT, minimum: 1, maximum: MAX_REPORT_LIMIT, description: 'How many reports, newest first' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REPORT_LIMIT)
  limit: number = DEFAULT_REPORT_LIMIT;
}
