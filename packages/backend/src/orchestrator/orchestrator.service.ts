import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotImplementedException, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobService } from '../governance/services/job.service';
import { PlanningService } from '../governance/services/planning.service';
import { DAILY_REPORT_QUEUE, JOB_EXECUTION_QUEUE, STRATEGY_EVALUATION_QUEUE } from '../queue/queue.constants';
import type { JobExecutionJobData } from '../queue/types/job-execution-job-data';
import type { WorkflowJobData } from '../queue/types/workflow-job-data';
import type { WorkflowEntity } from '../workflow/entities/workflow.entity';
import { WorkflowService } from '../workflow/workflow.service';
import type { SchedulingResult } from './types/scheduling-result';

/**
 * The AHE runtime's control plane. Starts and pauses Workflows, keeps them isolated, and decides
 * which Jobs run next within each Workflow's Job limit and budget.
 * It never queues Tasks: a queued Job queues its own Tasks, one at a time.
 */
@Injectable()
export class OrchestratorService implements OnApplicationBootstrap {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly planning: PlanningService,
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
   * daily-report and cycle-check repeatable jobs, and sets it `running`.
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
   * Queues as many startable Jobs as the Workflow's free capacity allows. Queue job IDs are the
   * Job IDs, so a Job already waiting is not queued twice.
   */
  async scheduleWorkflow(workflow: WorkflowEntity): Promise<SchedulingResult> {
    throw new NotImplementedException();
  }

  /**
   * How many more Jobs the Workflow may have active (running, under `maxConcurrentJobs`, under budget).
   */
  private async freeJobCapacity(workflow: WorkflowEntity): Promise<number> {
    throw new NotImplementedException();
  }
}
