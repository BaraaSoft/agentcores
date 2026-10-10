import { Injectable, NotImplementedException } from '@nestjs/common';
import { MemoryRetrievalService } from '../../memory/memory-retrieval.service';
import { ReasoningService } from '../../reasoning/reasoning.service';
import { WorkflowService } from '../../workflow/workflow.service';
import type { JobEntity } from '../entities/job.entity';
import type { StrategyEntity } from '../entities/strategy.entity';
import type { TaskEntity } from '../entities/task.entity';
import type { PlaceJobInput } from '../types/place-job-input';
import { JobService } from './job.service';
import { StrategyService } from './strategy.service';
import { TaskService } from './task.service';
import { UnitOfWorkService } from './unit-of-work.service';

/**
 * Turns reasoning-layer proposals into governance rows: plans new Strategies,
 * files Jobs under the right Unit (creating one only when nothing fits), and breaks Jobs into Tasks.
 */
@Injectable()
export class PlanningService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly memory: MemoryRetrievalService,
    private readonly reasoning: ReasoningService,
    private readonly strategies: StrategyService,
    private readonly units: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
  ) {}

  /**
   * Plans and saves a fresh 30-day Strategy for the Workflow, learning from past
   * evaluations, and makes it the active one.
   */
  async planNewStrategy(workflowId: string): Promise<StrategyEntity> {
    throw new NotImplementedException();
  }

  /**
   * Files a proposed Job under a matching Unit, or creates a new Unit when none fits.
   */
  async placeJob(input: PlaceJobInput): Promise<JobEntity> {
    throw new NotImplementedException();
  }

  /**
   * Breaks a Job into ordered pending Tasks.
   */
  async planJobTasks(jobId: string): Promise<TaskEntity[]> {
    throw new NotImplementedException();
  }
}
