import { Injectable } from '@nestjs/common';
import { ReportingService } from '../../../reporting/reporting.service';
import { EscalationResponseDto } from '../../escalations/dtos/escalation-response.dto';

/**
 * The open-escalations route's bridge to `ReportingService`.
 */
@Injectable()
export class WorkflowEscalationsApiService {
  constructor(private readonly reporting: ReportingService) {}

  async listOpenEscalations(workflowId: string): Promise<EscalationResponseDto[]> {
    const escalations = await this.reporting.listOpenEscalations(workflowId);
    return escalations.map((escalation) => EscalationResponseDto.fromEntity(escalation));
  }
}
