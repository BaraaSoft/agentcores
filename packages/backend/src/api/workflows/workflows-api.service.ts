import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategyService } from '../../governance/services/strategy.service';
import { OrchestratorService } from '../../orchestrator/orchestrator.service';
import { WorkflowService } from '../../workflow/workflow.service';
import type { CreateWorkflowRequestDto } from './dtos/create-workflow-request.dto';
import { WorkflowResponseDto } from './dtos/workflow-response.dto';

/**
 * The Workflow routes' bridge to the core: creating and reading go to `WorkflowService`, starting and
 * pausing go to `OrchestratorService`. Maps every result to `WorkflowResponseDto`.
 */
@Injectable()
export class WorkflowsApiService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly strategies: StrategyService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  async createWorkflow(body: CreateWorkflowRequestDto): Promise<WorkflowResponseDto> {
    const strategy = await this.strategies.findStrategyById(body.strategyId);
    if (strategy === null) throw new NotFoundException(`Strategy ${body.strategyId} not found`);
    return WorkflowResponseDto.fromEntity(await this.workflows.createWorkflow(body));
  }

  async getWorkflow(workflowId: string): Promise<WorkflowResponseDto> {
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow === null) throw new NotFoundException(`Workflow ${workflowId} not found`);
    return WorkflowResponseDto.fromEntity(workflow);
  }

  async startWorkflow(workflowId: string): Promise<WorkflowResponseDto> {
    return WorkflowResponseDto.fromEntity(await this.orchestrator.startWorkflow(workflowId));
  }

  async pauseWorkflow(workflowId: string): Promise<WorkflowResponseDto> {
    return WorkflowResponseDto.fromEntity(await this.orchestrator.pauseWorkflow(workflowId));
  }
}
