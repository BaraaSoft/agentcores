import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { MemoryRetrievalService } from '../../../memory/memory-retrieval.service';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import { JobReasoningService } from '../../../reasoning/job/job-reasoning.service';
import type { JobPlan } from '../../../reasoning/job/types/job-plan';
import type { WorkflowEntity } from '../../../workflow/entities/workflow.entity';
import { WorkflowService } from '../../../workflow/workflow.service';
import type { JobEntity } from '../../entities/job.entity';
import type { TaskEntity } from '../../entities/task.entity';
import { JobService } from '../../services/job.service';
import { REVIEWABLE_TASK_STATUSES, TaskService } from '../../services/task.service';
import type { CloseJobInput } from '../../types/close-job-input';
import {
  JOB_CONTEXT_RECORD_LIMIT,
  MAX_CONSECUTIVE_FAILURES,
  MAX_REVIEWING_ATTEMPTS,
  MAX_TASKS_ADDED_PER_REVIEW,
  MAX_TASKS_PER_JOB,
} from './job-execution.constants';

/**
 * Moves a Job forward. Job reasoning writes the first plan, then reviews every finished Task and
 * revises the plan (continue, edit, or end the Job). Once the Job's finished Tasks are reviewed, its
 * current Task is queued if it is pending. Only one Task of a Job is queued at a time; the Task
 * processor sends the Job back here when a Task completes or fails. Queuing the same Job again is
 * safe, which is how paused Jobs and resolved escalations resume.
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
   * Plans the Job if it has no Tasks, or reviews its finished Task awaiting review; then queues its
   * current Task if it is pending. Does nothing while the Workflow is not `running` or once the Job is closed.
   */
  async process(message: Job<JobExecutionJobData>): Promise<void> {
    const { workflowId, jobId } = message.data;
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow?.state !== 'running') return;

    const job = await this.jobs.findJobById(jobId);
    if (job === null || job.outcomeStatus !== null) return;

    const hasTasks = await this.tasks.hasTasks(jobId);
    const unreviewed = hasTasks ? await this.tasks.findUnreviewedTask(jobId) : null;
    if (!hasTasks || unreviewed !== null) {
      const isClosed = await this.jobReviewing(workflow, job, hasTasks);
      if (unreviewed !== null) await this.tasks.markTaskReviewed(unreviewed.id);
      if (isClosed) return;
    }

    const next = await this.tasks.findNextPendingTask(jobId);
    if (next !== null) await this.taskQueue.add(next.id, { workflowId, taskId: next.id });
  }

  /**
   * Asks Job reasoning for the plan from the Job's outcomes so far and applies it within the
   * guardrails: either the Job closes, or its not-started Tasks are replaced. Returns whether it closed.
   * Closes the Job as failed instead when the previous `MAX_REVIEWING_ATTEMPTS` attempts all threw.
   */
  private async jobReviewing(workflow: WorkflowEntity, job: JobEntity, isReview: boolean): Promise<boolean> {
    if ((await this.jobs.recordReviewingAttempt(job.id)) > MAX_REVIEWING_ATTEMPTS) {
      await this.jobs.closeJob({
        jobId: job.id,
        status: 'failed',
        summary: `Job reasoning failed ${MAX_REVIEWING_ATTEMPTS} times in a row.`,
      });
      return true;
    }

    const tasks = await this.tasks.listTasks(job.id);
    const finished = tasks.filter((task) => REVIEWABLE_TASK_STATUSES.includes(task.status));
    const remainingActions = tasks.filter((task) => task.status === 'pending').map((task) => task.action);

    const context = await this.memory.retrieveSafeContext({
      owner: workflow.owner,
      query: job.objective,
      limit: JOB_CONTEXT_RECORD_LIMIT,
    });
    const plan = await this.jobReasoning.planTasks({
      jobName: job.name,
      objective: job.objective,
      unitName: job.unitOfWork.name,
      safeContext: context.promptBlock,
      outcomes: finished.map((task) => ({
        action: task.action,
        status: task.status,
        result: task.result,
        failureReason: task.failureReason,
      })),
      remainingActions,
    });

    const started = tasks.filter((task) => task.status !== 'pending' && task.status !== 'cancelled').length;
    const maxRemaining = Math.min(
      MAX_TASKS_PER_JOB - started,
      isReview ? remainingActions.length + MAX_TASKS_ADDED_PER_REVIEW : MAX_TASKS_PER_JOB,
    );
    const actions = plan.remainingActions.slice(0, Math.max(maxRemaining, 0));

    const closing = this.closingOutcome(job.id, plan, finished, actions);
    if (closing !== null) await this.jobs.closeJob(closing);
    else await this.tasks.replaceRemainingTasks({ workflowId: workflow.id, jobId: job.id, actions });
    await this.jobs.resetReviewingAttempts(job.id);
    return closing !== null;
  }

  /**
   * How the Job closes, or null to keep going. Job reasoning decides success and abandonment; the
   * system decides failure — too many failed Tasks in a row, or no Tasks left to run.
   */
  private closingOutcome(
    jobId: string,
    plan: JobPlan,
    finished: readonly TaskEntity[],
    actions: readonly string[],
  ): CloseJobInput | null {
    if (plan.isObjectiveMet) return { jobId, status: 'success', summary: plan.summary };
    if (plan.abandonReason !== null) {
      return { jobId, status: 'abandoned', summary: `${plan.summary}\nAbandoned: ${plan.abandonReason}` };
    }

    const lastSuccess = finished.map((task) => task.status).lastIndexOf('complete');
    const failureStreak = finished.length - 1 - lastSuccess;
    if (failureStreak >= MAX_CONSECUTIVE_FAILURES) {
      const reason = finished[finished.length - 1].failureReason ?? 'unknown';
      return { jobId, status: 'failed', summary: `${plan.summary}\n${failureStreak} Tasks failed in a row; last: ${reason}` };
    }
    if (actions.length === 0) {
      const reason = plan.remainingActions.length === 0 ? 'No Tasks left to run.' : `Reached the ${MAX_TASKS_PER_JOB}-Task limit.`;
      return { jobId, status: 'failed', summary: `${plan.summary}\n${reason}` };
    }
    return null;
  }
}
