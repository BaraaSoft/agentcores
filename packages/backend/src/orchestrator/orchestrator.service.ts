import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotImplementedException, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PlanningService } from '../governance/services/planning.service';
import { TaskService } from '../governance/services/task.service';
import { DAILY_REPORT_QUEUE, STRATEGY_EVALUATION_QUEUE, TASK_EXECUTION_QUEUE } from '../queue/queue.constants';
import type { TaskExecutionJobData } from '../queue/types/task-execution-job-data';
import type { WorkflowJobData } from '../queue/types/workflow-job-data';
import type { WorkflowEntity } from '../workflow/entities/workflow.entity';
import { WorkflowService } from '../workflow/workflow.service';
import type { SchedulingResult } from './types/scheduling-result';

/**
 * The AHE runtime's control plane. Starts and pauses Workflows, keeps them isolated,
 * and decides which Tasks run next within each Workflow's concurrency and budget limits.
 */
@Injectable()
export class OrchestratorService implements OnApplicationBootstrap {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly planning: PlanningService,
    private readonly tasks: TaskService,
    @InjectQueue(TASK_EXECUTION_QUEUE)
    private readonly taskQueue: Queue<TaskExecutionJobData>,
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
   * Pauses a Workflow: removes its repeatable jobs and stops scheduling new Tasks.
   * Tasks already running are allowed to finish.
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
   * Enqueues as many pending Tasks as the Workflow's free capacity allows.
   */
  async scheduleWorkflow(workflow: WorkflowEntity): Promise<SchedulingResult> {
    throw new NotImplementedException();
  }

  /**
   * True when the Workflow may start another Task (running, under concurrency, under budget).
   */
  private async canScheduleMore(workflow: WorkflowEntity): Promise<boolean> {
    throw new NotImplementedException();
  }
}
