import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotImplementedException, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { StrategyEntity } from '../governance/entities/strategy.entity';
import { JobService } from '../governance/services/job.service';
import { StrategyService } from '../governance/services/strategy.service';
import { UnitOfWorkService } from '../governance/services/unit-of-work.service';
import { MemoryRetrievalService } from '../memory/memory-retrieval.service';
import { DAILY_REPORT_QUEUE, JOB_EXECUTION_QUEUE, STRATEGY_EVALUATION_QUEUE } from '../queue/queue.constants';
import type { JobExecutionJobData } from '../queue/types/job-execution-job-data';
import type { WorkflowJobData } from '../queue/types/workflow-job-data';
import { StrategyReasoningService } from '../reasoning/strategy/strategy-reasoning.service';
import { UnitReasoningService } from '../reasoning/unit-of-work/unit-reasoning.service';
import type { WorkflowEntity } from '../workflow/entities/workflow.entity';
import { WorkflowService } from '../workflow/workflow.service';
import type { SchedulingResult } from './types/scheduling-result';

/**
 * The AHE runtime's control plane. Starts and pauses Workflows, keeps them isolated, plans each
 * new Strategy, and decides which Jobs run next within each Workflow's Job limit and budget.
 * It never queues Tasks: a queued Job queues its own Tasks, one at a time.
 */
@Injectable()
export class OrchestratorService implements OnApplicationBootstrap {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly memory: MemoryRetrievalService,
    private readonly strategyReasoning: StrategyReasoningService,
    private readonly unitReasoning: UnitReasoningService,
    private readonly strategies: StrategyService,
    private readonly units: UnitOfWorkService,
    private readonly jobs: JobService,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
    @InjectQueue(DAILY_REPORT_QUEUE)
    private readonly reportQueue: Queue<WorkflowJobData>,
    @InjectQueue(STRATEGY_EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue<WorkflowJobData>,
  ) {}

  /**
   * On boot, starts the periodic scheduling loop for all `running` Workflows.
   */
  async onApplicationBootstrap(): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * Starts a Workflow: plans its first Strategy if it has none, registers its
   * daily-evaluation, daily-report and cycle-check repeatable jobs, and sets it `running`.
   */
  async startWorkflow(workflowId: string): Promise<WorkflowEntity> {
    throw new NotImplementedException();
  }

  /**
   * Pauses a Workflow: removes its repeatable jobs and stops scheduling. A Task already running
   * finishes; queued Tasks are skipped and stay pending until the Workflow resumes.
   */
  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
    throw new NotImplementedException();
  }

  /**
   * One scheduling pass across all running Workflows, in priority order.
   */
  async scheduleAllWorkflows(): Promise<SchedulingResult[]> {
    throw new NotImplementedException();
  }

  /**
   * Plans the next Strategy when the active one's cycle is over (after its review), then queues as
   * many startable Jobs as the Workflow's free capacity allows. Queue job IDs are the Job IDs,
   * so a Job already waiting is not queued twice.
   */
  async scheduleWorkflow(workflow: WorkflowEntity): Promise<SchedulingResult> {
    throw new NotImplementedException();
  }

  /**
   * Plans and saves a fresh 30-day Strategy, learning from past evaluations: Strategy reasoning
   * proposes its Units, then Unit reasoning proposes each Unit's Jobs, filed through
   * `JobService.placeJob`. Makes it the Workflow's active Strategy.
   */
  private async planStrategy(workflow: WorkflowEntity): Promise<StrategyEntity> {
    throw new NotImplementedException();
  }

  /**
   * How many more Jobs the Workflow may have active (running, under `maxConcurrentJobs`, under budget).
   */
  private async freeJobCapacity(workflow: WorkflowEntity): Promise<number> {
    throw new NotImplementedException();
  }
}
