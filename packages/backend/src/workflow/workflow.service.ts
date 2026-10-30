import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEntity } from './entities/workflow.entity';
import type { CreateWorkflowInput } from './types/create-workflow-input';
import type { UpdateWorkflowStateInput } from './types/update-workflow-state-input';

/**
 * Creates, reads, and changes the state of Workflows. Holds no scheduling logic —
 * that lives in the orchestrator.
 */
@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflows: Repository<WorkflowEntity>,
  ) {}

  /**
   * Creates a new Workflow in the `paused` state, running its Strategy on one machine.
   */
  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowEntity> {
    return this.workflows.save(
      this.workflows.create({ strategyId: input.strategyId, machineId: input.machineId, resources: input.resources }),
    );
  }

  /**
   * Returns the Workflow with its Strategy loaded, or null when it doesn't exist.
   */
  async findWorkflowById(workflowId: string): Promise<WorkflowEntity | null> {
    return this.workflows.findOne({ where: { id: workflowId }, relations: { strategy: true } });
  }

  /**
   * Returns every Workflow in a given state, each with its Strategy loaded (the orchestrator uses this
   * to find the `running` ones).
   */
  async listWorkflowsByState(state: WorkflowEntity['state']): Promise<WorkflowEntity[]> {
    return this.workflows.find({ where: { state }, relations: { strategy: true }, order: { createdAt: 'ASC' } });
  }

  /**
   * Moves a Workflow to `running` or `paused`, and returns it with its Strategy loaded.
   */
  async updateWorkflowState(input: UpdateWorkflowStateInput): Promise<WorkflowEntity> {
    await this.workflows.update({ id: input.workflowId }, { state: input.state });
    const workflow = await this.findWorkflowById(input.workflowId);
    if (workflow === null) throw new NotFoundException(`Workflow ${input.workflowId} not found`);
    return workflow;
  }
}
