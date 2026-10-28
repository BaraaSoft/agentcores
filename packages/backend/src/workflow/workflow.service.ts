import { Injectable, NotImplementedException } from '@nestjs/common';
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
    throw new NotImplementedException();
  }

  /**
   * Returns the Workflow, or null when it doesn't exist.
   */
  async findWorkflowById(workflowId: string): Promise<WorkflowEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * Returns every Workflow in a given state (the orchestrator uses this to find `running` ones).
   */
  async listWorkflowsByState(state: WorkflowEntity['state']): Promise<WorkflowEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * Moves a Workflow to `running`, `paused`, or `evaluating`.
   */
  async updateWorkflowState(input: UpdateWorkflowStateInput): Promise<WorkflowEntity> {
    throw new NotImplementedException();
  }
}
