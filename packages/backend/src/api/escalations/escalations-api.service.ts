import { Injectable } from '@nestjs/common';
import { ReportingService } from '../../reporting/reporting.service';
import { EscalationResponseDto } from './dtos/escalation-response.dto';
import type { ResolveEscalationRequestDto } from './dtos/resolve-escalation-request.dto';

/**
 * The resolve route's bridge to `ReportingService`.
 */
@Injectable()
export class EscalationsApiService {
  constructor(private readonly reporting: ReportingService) {}

  async resolveEscalation(escalationId: string, body: ResolveEscalationRequestDto): Promise<EscalationResponseDto> {
    const escalation = await this.reporting.resolveEscalation({
      escalationId,
      isApproved: body.isApproved,
      ownerNote: body.ownerNote ?? null,
    });
    return EscalationResponseDto.fromEntity(escalation);
  }
}
