import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import { PlanningService } from '../../services/planning.service';
import { TaskService } from '../../services/task.service';

/**
 * Starts a Job: breaks it into Tasks the first time, then queues its next pending Task.
 * Only one Task of a Job is queued at a time; the Task processor queues the next one when a Task
 * completes, so a failed, escalated, or deferred Task holds the rest of the Job.
 * Queuing the same Job again is safe, which is how a paused Workflow's Jobs resume.
 */
@Processor(JOB_EXECUTION_QUEUE)
export class JobExecutionProcessor extends WorkerHost {
  constructor(
    private readonly planning: PlanningService,
    private readonly tasks: TaskService,
    @InjectQueue(TASK_EXECUTION_QUEUE)
    private readonly taskQueue: Queue<TaskExecutionJobData>,
  ) {
    super();
  }

  /**
   * Breaks the Job down if needed and queues its next pending Task.
   */
  async process(job: Job<JobExecutionJobData>): Promise<void> {
    const { workflowId, jobId } = job.data;
    await this.planning.planJobTasks(jobId);
    const next = await this.tasks.findNextPendingTask(jobId);
    if (next !== null) await this.taskQueue.add(next.id, { workflowId, taskId: next.id });
  }
}
