import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_NOTE_LENGTH = 2_000;

/**
 * Body for `POST /escalations/:id/resolve`.
 */
export class ResolveEscalationRequestDto {
  @ApiProperty({ description: 'true = go ahead, false = do not' })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({ description: 'Guidance for the agent, e.g. a tone change' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  ownerNote?: string;
}
