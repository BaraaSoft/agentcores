import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { MemoryRetrievalService } from '../../../memory/memory-retrieval.service';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import { JobReasoningService } from '../../../reasoning/job/job-reasoning.service';
import type { WorkflowEntity } from '../../../workflow/entities/workflow.entity';
import { WorkflowService } from '../../../workflow/workflow.service';
import { JobService } from '../../services/job.service';
import { TaskService } from '../../services/task.service';
import { JOB_CONTEXT_RECORD_LIMIT } from './job-execution.constants';

/**
 * Starts a Job: Job reasoning breaks it into Tasks the first time, then the Job's current Task is
 * queued if it is pending. Only one Task of a Job is queued at a time; the Task processor queues the
 * next one when a Task completes, so a failed, escalated, or deferred Task holds the rest of the Job.
 * Queuing the same Job again is safe, which is how paused Jobs and approved escalations resume.
 */
@Processor(JOB_EXECUTION_QUEUE)
export class JobExecutionProcessor extends WorkerHost {
  constructor(
    @InjectQueue(TASK_EXECUTION_QUEUE)
    private readonly taskQueue: Queue<TaskExecutionJobData>,
    private readonly jobReasoning: JobReasoningService,
    private readonly workflows: WorkflowService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
    private readonly memory: MemoryRetrievalService,
  ) {
    super();
  }

  /**
   * Breaks the Job down if it has no Tasks yet and queues its next pending Task.
   * Does nothing while the Workflow is not `running`.
   */
  async process(message: Job<JobExecutionJobData>): Promise<void> {
    const { workflowId, jobId } = message.data;
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow?.state !== 'running') return;

    if (!(await this.tasks.hasTasks(jobId))) await this.breakDown(workflow, jobId);

    const next = await this.tasks.findNextPendingTask(jobId);
    if (next !== null) await this.taskQueue.add(next.id, { workflowId, taskId: next.id });
  }

  /**
   * Asks Job reasoning for the Job's ordered actions and saves them as pending Tasks.
   */
  private async breakDown(workflow: WorkflowEntity, jobId: string): Promise<void> {
    const job = await this.jobs.findJobById(jobId);
    if (job === null) throw new Error(`Job ${jobId} not found`);

    const context = await this.memory.retrieveSafeContext({
      owner: workflow.owner,
      query: job.objective,
      limit: JOB_CONTEXT_RECORD_LIMIT,
    });
    const breakdown = await this.jobReasoning.breakDownJob({
      jobName: job.name,
      objective: job.objective,
      unitName: job.unitOfWork.name,
      safeContext: context.promptBlock,
    });
    await this.tasks.createTasks({ workflowId: workflow.id, jobId, actions: breakdown.actions });
  }
}
