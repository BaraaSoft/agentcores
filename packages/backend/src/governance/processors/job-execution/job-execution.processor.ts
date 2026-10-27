import type { TaskStatus } from '@ahe/agent-core';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { MemoryRetrievalService } from '../../../memory/memory-retrieval.service';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import { JobReasoningService } from '../../../reasoning/job/job-reasoning.service';
import type { TaskOutcome } from '../../../reasoning/job/types/task-outcome';
import type { WorkflowEntity } from '../../../workflow/entities/workflow.entity';
import { WorkflowService } from '../../../workflow/workflow.service';
import type { JobEntity } from '../../entities/job.entity';
import type { TaskEntity } from '../../entities/task.entity';
import { JobService } from '../../services/job.service';
import { TaskService } from '../../services/task.service';
import {
  JOB_CONTEXT_RECORD_LIMIT,
  MAX_CONSECUTIVE_FAILURES,
  MAX_REVIEWING_ATTEMPTS,
  MAX_TASKS_ADDED_PER_REVIEW,
  MAX_TASKS_PER_JOB,
} from './job-execution.constants';

/** Tasks Job reasoning sees as history: everything that finished or was dropped. */
const HISTORY_STATUSES: readonly TaskStatus[] = ['complete', 'failed', 'cancelled'];

type JobRun = { readonly workflow: WorkflowEntity; readonly job: JobEntity; readonly safeContext: string };

/**
 * Moves a Job forward in two separate steps. **Reviewing** judges each finished Task in one structured
 * call: continue, revise, met, or abandon. **Planning** lets Job reasoning edit the remaining plan
 * with its planning tools — for a new Job, or when the review asks for changes — and this processor
 * saves the result in one write. Once the Job's finished Tasks are reviewed, its current Task is
 * queued if it is pending. Only one Task of a Job is queued at a time; the Task processor sends the
 * Job back here when a Task completes or fails. Queuing the same Job again is safe, which is how
 * paused Jobs and resolved escalations resume.
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

    const tasks = await this.tasks.listTasks(jobId);
    const unreviewed = tasks.length === 0 ? null : await this.tasks.findUnreviewedTask(jobId);
    if (tasks.length === 0 || unreviewed !== null) {
      const isClosed = await this.withReviewingAttempts(job, async () => {
        const run = await this.startRun(workflow, job);
        return unreviewed === null
          ? this.planTasks(run, tasks, 'This is a new Job: write its first plan.', '')
          : this.reviewJob(run, tasks, unreviewed);
      });
      if (unreviewed !== null) await this.tasks.markTaskReviewed(unreviewed.id);
      // The Job just got its final outcome, so stop here and queue nothing:
      // - success: the review said the objective is met.
      // - abandoned: the review decided to stop.
      // - failed: a system limit was hit (3 failed Tasks in a row, an empty plan,
      //   the 20-Task cap, or Job reasoning throwing too many times).
      // Its pending Tasks were already cancelled when it closed.
      if (isClosed) return;
    }

    const next = await this.tasks.findNextPendingTask(jobId);
    if (next !== null) await this.taskQueue.add(next.id, { workflowId, taskId: next.id });
  }

  /**
   * Runs one review or plan, counting the attempt. When the previous `MAX_REVIEWING_ATTEMPTS` attempts
   * all threw, closes the Job as failed instead of calling Job reasoning again. Returns whether the Job closed.
   */
  private async withReviewingAttempts(job: JobEntity, step: () => Promise<boolean>): Promise<boolean> {
    if ((await this.jobs.recordReviewingAttempt(job.id)) > MAX_REVIEWING_ATTEMPTS) {
      return this.fail(job.id, '', `Job reasoning failed ${MAX_REVIEWING_ATTEMPTS} times in a row.`);
    }
    const isClosed = await step();
    await this.jobs.resetReviewingAttempts(job.id);
    return isClosed;
  }

  private async startRun(workflow: WorkflowEntity, job: JobEntity): Promise<JobRun> {
    const context = await this.memory.retrieveSafeContext({
      owner: workflow.owner,
      query: job.objective,
      limit: JOB_CONTEXT_RECORD_LIMIT,
    });
    return { workflow, job, safeContext: context.promptBlock };
  }

  /**
   * Reviews the Task that just finished and acts on the verdict: close the Job (met, abandoned, or too
   * many failures in a row), keep the plan, or hand the review's notes to planning. Returns whether the Job closed.
   */
  private async reviewJob(run: JobRun, tasks: readonly TaskEntity[], latest: TaskEntity): Promise<boolean> {
    const finished = tasks.filter((task) => task.status === 'complete' || task.status === 'failed');
    const failureStreak = finished.length - 1 - finished.map((task) => task.status).lastIndexOf('complete');
    if (failureStreak >= MAX_CONSECUTIVE_FAILURES) {
      return this.fail(run.job.id, '', `${failureStreak} Tasks failed in a row; last: ${latest.failureReason ?? 'unknown'}`);
    }

    const remainingActions = this.remainingActions(tasks);
    const review = await this.jobReasoning.reviewJob({
      ...this.jobContext(run),
      latestOutcome: this.outcome(latest),
      history: this.history(tasks.filter((task) => task.id !== latest.id)),
      remainingActions,
    });

    switch (review.decision) {
      case 'met':
        return this.close(run.job.id, 'success', review.summary);
      case 'abandon':
        return this.close(run.job.id, 'abandoned', `${review.summary}\nAbandoned: ${review.rationale}`);
      case 'revise':
        return this.planTasks(
          run,
          tasks,
          `The review asked for changes: ${review.revisionNotes ?? review.rationale}`,
          review.summary,
        );
      case 'continue':
        // TODO(orchestration): with nothing left to run, the Job stays open and idle until the
        // cycle-end evaluation. Decide whether to replan, close it, or wake the Unit here.
        return false;
    }
  }

  /**
   * Lets Job reasoning edit the remaining plan over a draft, within the Task limits, then saves the
   * draft in one write. An empty plan closes the Job as failed. Returns whether the Job closed.
   */
  private async planTasks(run: JobRun, tasks: readonly TaskEntity[], reason: string, summary: string): Promise<boolean> {
    const remainingActions = this.remainingActions(tasks);
    const started = tasks.filter((task) => task.status !== 'pending' && task.status !== 'cancelled').length;
    const isFirstPlan = tasks.length === 0;
    const maxTasks = Math.min(
      MAX_TASKS_PER_JOB - started,
      isFirstPlan ? MAX_TASKS_PER_JOB : remainingActions.length + MAX_TASKS_ADDED_PER_REVIEW,
    );
    if (maxTasks <= 0) return this.fail(run.job.id, summary, `Reached the ${MAX_TASKS_PER_JOB}-Task limit.`);

    const actions = await this.jobReasoning.planTasks({
      ...this.jobContext(run),
      reason,
      history: this.history(tasks),
      remainingActions,
      maxTasks,
    });
    if (actions.length === 0) return this.fail(run.job.id, summary, 'Planning left no Tasks to run.');

    await this.tasks.replaceRemainingTasks({ workflowId: run.workflow.id, jobId: run.job.id, actions });
    return false;
  }

  private jobContext(run: JobRun) {
    return {
      jobName: run.job.name,
      objective: run.job.objective,
      unitName: run.job.unitOfWork.name,
      safeContext: run.safeContext,
    };
  }

  private history(tasks: readonly TaskEntity[]): TaskOutcome[] {
    return tasks.filter((task) => HISTORY_STATUSES.includes(task.status)).map((task) => this.outcome(task));
  }

  private outcome(task: TaskEntity): TaskOutcome {
    return {
      action: task.action,
      status: task.status,
      result: task.result,
      failureReason: task.failureReason,
      locationPath: task.locationPath,
      locationDetails: task.locationDetails,
    };
  }

  private remainingActions(tasks: readonly TaskEntity[]): string[] {
    return tasks.filter((task) => task.status === 'pending').map((task) => task.action);
  }

  private async close(jobId: string, status: 'success' | 'abandoned', summary: string): Promise<boolean> {
    await this.jobs.closeJob({ jobId, status, summary });
    return true;
  }

  /** Closes the Job as failed — the system's call, never Job reasoning's. */
  private async fail(jobId: string, summary: string, reason: string): Promise<boolean> {
    await this.jobs.closeJob({ jobId, status: 'failed', summary: summary === '' ? reason : `${summary}\n${reason}` });
    return true;
  }
}
