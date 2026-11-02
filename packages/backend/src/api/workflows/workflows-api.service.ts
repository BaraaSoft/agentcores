import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategyService } from '../../governance/services/strategy.service';
import { TaskService } from '../../governance/services/task.service';
import { OrchestratorService } from '../../orchestrator/orchestrator.service';
import { WorkflowService } from '../../workflow/workflow.service';
import type { RunStrategyRequestDto } from '../strategies/dtos/run-strategy-request.dto';
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
    private readonly tasks: TaskService,
  ) {}

  async createWorkflow(body: CreateWorkflowRequestDto): Promise<WorkflowResponseDto> {
    await this.findStrategy(body.strategyId);
    return WorkflowResponseDto.fromEntity(await this.workflows.createWorkflow(body));
  }

  /**
   * Runs a Strategy again: creates a fresh Workflow that starts at its first Unit of Work, and starts
   * it. Starting pauses the machine's running Workflow and all its work first. Returns at once; the
   * old run frees the machine when its current step ends, which `activeTaskCount` shows.
   */
  async runStrategy(strategyId: string, body: RunStrategyRequestDto): Promise<WorkflowResponseDto> {
    await this.findStrategy(strategyId);
    const created = await this.workflows.createWorkflow({ strategyId, machineId: body.machineId, resources: body.resources });
    return WorkflowResponseDto.fromEntity(await this.orchestrator.startWorkflow(created.id));
  }

  async listWorkflows(): Promise<WorkflowResponseDto[]> {
    const [workflows, running] = await Promise.all([this.workflows.listWorkflows(), this.tasks.countRunningTasksByWorkflow()]);
    return workflows.map((workflow) => WorkflowResponseDto.fromEntity(workflow, running.get(workflow.id) ?? 0));
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

  private async findStrategy(strategyId: string): Promise<void> {
    if ((await this.strategies.findStrategyById(strategyId)) === null) throw new NotFoundException(`Strategy ${strategyId} not found`);
  }
}
