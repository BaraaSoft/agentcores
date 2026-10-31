import type { ExecutionProvider, ExecutionResult } from '@ahe/agent-core';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { IdentityService } from '../../../identity/identity.service';
import { MemoryRetrievalService } from '../../../memory/memory-retrieval.service';
import { PrivacyFilterService } from '../../../memory/privacy-filter.service';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import type { TaskOutcome } from '../../../reasoning/job/types/task-outcome';
import { TASK_SKILLS } from '../../../reasoning/task/skills';
import { renderTaskOutcomes } from '../../../reasoning/task-outcome.prompts';
import { TaskReasoningService } from '../../../reasoning/task/task-reasoning.service';
import type { PlannedStep } from '../../../reasoning/task/types/planned-step';
import type { StepRecord } from '../../../reasoning/task/types/step-record';
import type { TaskReasoningInput } from '../../../reasoning/task/types/task-reasoning-input';
import { ReportingService } from '../../../reporting/reporting.service';
import type { TaskEntity } from '../../entities/task.entity';
import { JobScreenshotService } from '../../services/job-screenshot.service';
import { MetricsService } from '../../services/metrics.service';
import { TaskService } from '../../services/task.service';
import { toTaskOutcome } from '../to-task-outcome';
import {
  CHALLENGE_WINDOW_MS,
  EARLIER_TASKS_IN_EXECUTION_CONTEXT,
  MAX_TASK_ITERATIONS,
  TASK_CONTEXT_RECORD_LIMIT,
} from './task-execution.constants';
import { EXECUTION_PROVIDER } from './task-execution.tokens';
import type { TaskRunOutcome } from './types/task-run-outcome';

type TaskRun = {
  readonly workflowId: string;
  readonly task: TaskEntity;
  readonly safeContext: string;
  readonly earlierTasks: readonly TaskOutcome[];
};

type StepsEnd = Omit<TaskRunOutcome, 'taskId' | 'iterations'> & {
  readonly history: readonly StepRecord[];
  readonly learnings: readonly string[];
};

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1_000;

/**
 * Runs one Task: Task reasoning (Opus) plans a step, the execution layer (Sonnet/Haiku) carries it
 * out on screen, and the result goes back to reasoning, until the Task is done, escalated, deferred,
 * or failed. When it completes or fails, the Job goes back to Job reasoning for review, which decides
 * the next Task, so a Job's Tasks run one after another.
 *
 * Concurrency is 1: there is one screen and one mouse on the Mac Mini.
 *
 * Task reasoning sees only text: privacy-filtered memory, the Job's earlier Tasks, and execution results.
 * A visual skill's final screen is saved for Job review and the evaluator, never sent to Task reasoning.
 * Logins come from IdentityService and go straight to the execution layer, never to reasoning.
 */
@Processor(TASK_EXECUTION_QUEUE, { concurrency: 1 })
export class TaskExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskExecutionProcessor.name);

  constructor(
    @Inject(EXECUTION_PROVIDER)
    private readonly executionProvider: ExecutionProvider,
    @InjectQueue(TASK_EXECUTION_QUEUE)
    private readonly taskQueue: Queue<TaskExecutionJobData>,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
    private readonly taskReasoning: TaskReasoningService,
    private readonly tasks: TaskService,
    private readonly metrics: MetricsService,
    private readonly memory: MemoryRetrievalService,
    private readonly privacyFilter: PrivacyFilterService,
    private readonly identity: IdentityService,
    private readonly reporting: ReportingService,
    private readonly screenshots: JobScreenshotService,
  ) {
    super();
  }

  /**
   * Runs the queued Task and records how it ended. Runs a `pending` Task, or a `deferred` one whose
   * delay is up. Returns `null` without running when the Task is in any other state (delivered twice)
   * or its Unit of Work is not `running`, or another worker claimed it first; a deferred Task that comes
   * due while paused goes back to pending, so it runs when its Job is queued again on resume.
   */
  async process(message: Job<TaskExecutionJobData>): Promise<TaskRunOutcome | null> {
    const { workflowId, taskId } = message.data;
    const task = await this.tasks.findTaskWithLineage(taskId);
    if (task?.status !== 'pending' && task?.status !== 'deferred') return null;
    if (task.job.unitOfWork.state !== 'running') {
      if (task.status === 'deferred') await this.tasks.markTaskPending(taskId);
      return null;
    }

    if (!(await this.tasks.markTaskRunning(taskId))) return null;
    const owner = task.job.unitOfWork.strategy.owner;
    try {
      const context = await this.memory.retrieveSafeContext({
        owner,
        query: task.action,
        limit: TASK_CONTEXT_RECORD_LIMIT,
      });
      const run: TaskRun = { workflowId, task, safeContext: context.promptBlock, earlierTasks: await this.earlierTasks(task) };
      const end = await this.runSteps(run);
      await this.finish(run, owner, end);
      return {
        taskId,
        status: end.status,
        summary: end.summary,
        iterations: end.history.length,
        retryAfterMinutes: end.retryAfterMinutes,
      };
    } catch (error) {
      await this.tasks.markTaskFailed({ taskId, reason: error instanceof Error ? error.message : String(error) });
      await this.queueJobReview(workflowId, task.jobId);
      throw error;
    }
  }

  /**
   * The plan → execute loop. Ends on the first of: reasoning says done, a step needs the owner,
   * a blocker decision stops the Task, a sealed instruction, or `MAX_TASK_ITERATIONS` steps.
   */
  private async runSteps(run: TaskRun): Promise<StepsEnd> {
    const history: StepRecord[] = [];
    const learnings: string[] = [];
    let recentChallengeCount = 0;
    const input = (): TaskReasoningInput => ({
      taskAction: run.task.action,
      skillType: run.task.skillType,
      jobObjective: run.task.job.objective,
      safeContext: run.safeContext,
      earlierTasks: run.earlierTasks,
      history: [...history],
      recentChallengeCount,
    });
    const end = (status: StepsEnd['status'], summary: string, retryAfterMinutes: number | null = null): StepsEnd => ({
      status,
      summary,
      retryAfterMinutes,
      history,
      learnings,
    });

    let step = await this.taskReasoning.planNextStep(input());
    for (;;) {
      if (step.isTaskDone) return end('complete', history.at(-1)?.result.summary ?? step.rationale);
      if (step.needsHumanJudgment) return end('escalated', step.instruction);
      if (this.privacyFilter.containsSealedTopic(step.instruction)) {
        return end('failed', 'Refused a step whose instruction mentions a sealed topic.');
      }
      if (history.length >= MAX_TASK_ITERATIONS) {
        return end('failed', `Stopped after ${MAX_TASK_ITERATIONS} steps without finishing.`);
      }

      const result = await this.executeStep(run, step);
      history.push({ instruction: step.instruction, platform: step.platform, result });
      if (result.status !== 'blocked') {
        step = await this.taskReasoning.planNextStep(input());
        continue;
      }

      recentChallengeCount = await this.recordChallenge(run, step.platform, result);
      const decision = await this.taskReasoning.decideOnBlocker(input());
      if (decision.learning !== null) learnings.push(decision.learning);
      if (decision.ownerRequest !== null) return end('escalated', decision.ownerRequest);
      if (decision.retryAfterMinutes !== null) return end('deferred', decision.rationale, decision.retryAfterMinutes);
      if (decision.nextStep === null) return end('failed', decision.rationale);
      step = decision.nextStep;
    }
  }

  /** The Job's Tasks that finished before this one, in order. */
  private async earlierTasks(task: TaskEntity): Promise<TaskOutcome[]> {
    const tasks = await this.tasks.listTasks(task.jobId);
    return tasks
      .filter((each) => each.sequence < task.sequence && (each.status === 'complete' || each.status === 'failed'))
      .map(toTaskOutcome);
  }

  /**
   * Sends one step to the execution layer, with the login for `step.platform` when the Workflow has one,
   * and the step limit of the Task's skill. A skill that returns screenshots gets the final screen saved
   * as the Task's latest; the screenshot itself never goes back into Task reasoning's history.
   */
  private async executeStep(run: TaskRun, step: PlannedStep): Promise<ExecutionResult> {
    const skill = TASK_SKILLS[run.task.skillType];
    const credentials =
      step.platform === null ? null : await this.identity.getCredentials({ workflowId: run.workflowId, platform: step.platform });
    const startedAt = Date.now();
    const { finalScreenshot, ...result } = await this.executionProvider.runTask({
      taskId: run.task.id,
      instruction: step.instruction,
      context: this.executionContext(run),
      maxSteps: skill.maxExecutionSteps,
      credentials,
      returnsScreenshot: skill.returnsScreenshot,
    });
    // One line per execution step, to measure pace. A turn is one model call on screen: it looks at the latest
    // screenshot and sends one or more actions. Few turns for the work means the agent batches its actions.
    // The seconds are wall time for the whole step, model calls and screen actions together.
    const seconds = Math.round((Date.now() - startedAt) / MS_PER_SECOND);
    this.logger.log(`Task ${run.task.id} [${run.task.skillType}] step ${result.status}: ${result.stepsTaken} turns in ${seconds}s`);
    if (finalScreenshot !== undefined) {
      await this.screenshots.saveTaskScreenshot({ jobId: run.task.jobId, taskId: run.task.id, screenshot: finalScreenshot });
    }
    return result;
  }

  /** The owner context, then what the Job's latest earlier Tasks did and where, so the agent can build on them. */
  private executionContext(run: TaskRun): string {
    const earlier = run.earlierTasks.slice(-EARLIER_TASKS_IN_EXECUTION_CONTEXT);
    if (earlier.length === 0) return run.safeContext;
    return `${run.safeContext}\n\nEarlier Tasks in this Job:\n${renderTaskOutcomes(earlier, '')}`.trim();
  }

  /**
   * Logs a gate against the platform's account and returns how many gates it hit recently.
   */
  private async recordChallenge(run: TaskRun, platform: string | null, result: ExecutionResult): Promise<number> {
    if (platform === null || result.blocker === null) return 0;
    await this.identity.recordChallenge({ workflowId: run.workflowId, platform, taskId: run.task.id, blocker: result.blocker });
    return this.identity.countRecentChallenges({
      workflowId: run.workflowId,
      platform,
      since: new Date(Date.now() - CHALLENGE_WINDOW_MS),
    });
  }

  /**
   * Saves how the Task ended, stores its learnings, and moves the Job along: complete and failed send
   * the Job back for review, deferred re-queues this Task after the delay, escalated holds the Job
   * until the owner decides.
   */
  private async finish(run: TaskRun, owner: string, end: StepsEnd): Promise<void> {
    const { workflowId, task } = run;
    switch (end.status) {
      case 'complete': {
        const metricReadings = end.history.reduce<Record<string, number>>(
          (readings, step) => ({ ...readings, ...step.result.metricReadings }),
          {},
        );
        await this.tasks.markTaskComplete({
          taskId: task.id,
          result: {
            summary: end.summary,
            metricReadings,
            steps: end.history.length,
            screenTurns: end.history.reduce((sum, step) => sum + step.result.stepsTaken, 0),
            completedAt: new Date(),
          },
          ...this.locationOf(end.history),
        });
        if (Object.keys(metricReadings).length > 0) {
          await this.metrics.recordReadings({ unitOfWorkId: task.job.unitOfWorkId, taskId: task.id, readings: metricReadings });
        }
        await this.queueJobReview(workflowId, task.jobId);
        break;
      }
      case 'failed':
        await this.tasks.markTaskFailed({ taskId: task.id, reason: end.summary });
        await this.queueJobReview(workflowId, task.jobId);
        break;
      case 'escalated':
        await this.reporting.raiseEscalation({ workflowId, taskId: task.id, question: end.summary });
        break;
      case 'deferred':
        await this.tasks.markTaskDeferred(task.id);
        await this.taskQueue.add(
          task.id,
          { workflowId, taskId: task.id },
          { delay: (end.retryAfterMinutes ?? 0) * MS_PER_MINUTE },
        );
        break;
    }
    for (const content of end.learnings) {
      await this.memory.recordLearning({ owner, workflowId, content });
    }
  }

  /**
   * The Task's location: from the latest step the execution layer finished (`done`) with a location.
   * A later step may only have checked something elsewhere, so the latest step alone is not enough.
   */
  private locationOf(history: readonly StepRecord[]): { locationPath: string | null; locationDetails: string | null } {
    const located = [...history].reverse().find((step) => step.result.status === 'done' && step.result.locationPath !== '');
    if (located === undefined) return { locationPath: null, locationDetails: null };
    return { locationPath: located.result.locationPath, locationDetails: located.result.locationDetails || null };
  }

  /**
   * Queues the Job so Job reasoning reviews the Task that just finished. The Job ID is the queue job
   * ID, so the Job is never queued twice.
   */
  private async queueJobReview(workflowId: string, jobId: string): Promise<void> {
    await this.jobQueue.add(jobId, { workflowId, jobId }, { jobId });
  }
}
