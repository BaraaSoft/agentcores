import { Injectable, NotImplementedException } from '@nestjs/common';
import { MemoryRetrievalService } from '../../memory/memory-retrieval.service';
import { JobReasoningService } from '../../reasoning/job/job-reasoning.service';
import { StrategyReasoningService } from '../../reasoning/strategy/strategy-reasoning.service';
import { UnitReasoningService } from '../../reasoning/unit-of-work/unit-reasoning.service';
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
 * Turns reasoning-layer proposals into governance rows, walking down the hierarchy one level at a time:
 * the Strategy level plans Units, each Unit plans its Jobs, each Job plans its Tasks.
 * Files Jobs under the right Unit, creating one only when nothing fits.
 */
@Injectable()
export class PlanningService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly memory: MemoryRetrievalService,
    private readonly strategyReasoning: StrategyReasoningService,
    private readonly unitReasoning: UnitReasoningService,
    private readonly jobReasoning: JobReasoningService,
    private readonly strategies: StrategyService,
    private readonly units: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
  ) {}

  /**
   * Plans and saves a fresh 30-day Strategy for the Workflow, learning from past evaluations:
   * its Units first, then each Unit's Jobs (`planUnitJobs`). Makes it the active Strategy.
   */
  async planNewStrategy(workflowId: string): Promise<StrategyEntity> {
    throw new NotImplementedException();
  }

  /**
   * Asks the Unit level for Jobs and files each one through `placeJob`. Used for new Units,
   * and for Units whose Jobs have all finished. Returns the Jobs it created.
   */
  async planUnitJobs(unitOfWorkId: string): Promise<JobEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * Files a proposed Job under a matching Unit, or creates a new Unit when none fits.
   */
  async placeJob(input: PlaceJobInput): Promise<JobEntity> {
    throw new NotImplementedException();
  }

  /**
   * Breaks a Job into ordered pending Tasks. Does nothing and returns the existing Tasks when the
   * Job already has some, so a Job queued twice is only broken down once.
   */
  async planJobTasks(jobId: string): Promise<TaskEntity[]> {
    throw new NotImplementedException();
  }
}
