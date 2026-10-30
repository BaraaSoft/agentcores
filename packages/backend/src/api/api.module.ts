import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { ReportingModule } from '../reporting/reporting.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { EscalationsController } from './escalations/escalations.controller';
import { EscalationsApiService } from './escalations/escalations-api.service';
import { StrategiesController } from './strategies/strategies.controller';
import { StrategiesApiService } from './strategies/strategies-api.service';
import { WorkflowEscalationsController } from './workflows/escalations/workflow-escalations.controller';
import { WorkflowEscalationsApiService } from './workflows/escalations/workflow-escalations-api.service';
import { ProgressController } from './workflows/progress/progress.controller';
import { ProgressApiService } from './workflows/progress/progress-api.service';
import { ReportsController } from './workflows/reports/reports.controller';
import { ReportsApiService } from './workflows/reports/reports-api.service';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowsApiService } from './workflows/workflows-api.service';

/**
 * Every REST route of the backend. The folders follow the route: `/workflows/:id/progress` lives in
 * `workflows/progress/`, `/escalations/:id/resolve` in `escalations/`. Each resource has a controller,
 * a thin service that calls the core services and maps their results to response DTOs, and its own
 * request and response DTOs. No other module has a controller, and no business rule lives here.
 */
@Module({
  imports: [WorkflowModule, GovernanceModule, OrchestratorModule, ReportingModule],
  controllers: [
    StrategiesController,
    WorkflowsController,
    ProgressController,
    ReportsController,
    WorkflowEscalationsController,
    EscalationsController,
  ],
  providers: [
    StrategiesApiService,
    WorkflowsApiService,
    ProgressApiService,
    ReportsApiService,
    WorkflowEscalationsApiService,
    EscalationsApiService,
  ],
})
export class ApiModule {}
