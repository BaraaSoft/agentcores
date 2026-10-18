import type { ExecutionProvider, ExecutionResult } from '@ahe/agent-core';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { IdentityService } from '../../../identity/identity.service';
import { MemoryRetrievalService } from '../../../memory/memory-retrieval.service';
import { PrivacyFilterService } from '../../../memory/privacy-filter.service';
import { TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { TaskExecutionJobData } from '../../../queue/types/task-execution-job-data';
import { TaskReasoningService } from '../../../reasoning/task/task-reasoning.service';
import type { PlannedStep } from '../../../reasoning/task/types/planned-step';
import type { StepRecord } from '../../../reasoning/task/types/step-record';
import type { TaskReasoningInput } from '../../../reasoning/task/types/task-reasoning-input';
import { ReportingService } from '../../../reporting/reporting.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import type { TaskEntity } from '../../entities/task.entity';
import { MetricsService } from '../../services/metrics.service';
import { TaskService } from '../../services/task.service';
import {
  CHALLENGE_WINDOW_MS,
  EXECUTION_MAX_STEPS,
  MAX_TASK_ITERATIONS,
  TASK_CONTEXT_RECORD_LIMIT,
} from './task-execution.constants';
import { EXECUTION_PROVIDER } from './task-execution.tokens';
import type { TaskRunOutcome } from './types/task-run-outcome';

type TaskRun = { readonly workflowId: string; readonly task: TaskEntity; readonly safeContext: string };

type StepsEnd = Omit<TaskRunOutcome, 'taskId' | 'iterations'> & {
  readonly history: readonly StepRecord[];
  readonly learnings: readonly string[];
};

const MS_PER_MINUTE = 60_000;

/**
 * Runs one Task: Task reasoning (Opus) plans a step, the execution layer (Sonnet/Haiku) carries it
 * out on screen, and the result goes back to reasoning, until the Task is done, escalated, deferred,
 * or failed. On completion it queues the Job's next Task, so a Job's Tasks run one after another.
 *
 * Concurrency is 1: there is one screen and one mouse on the Mac Mini.
 *
 * Reasoning sees only text: privacy-filtered memory and execution results, never screenshots.
 * Logins come from IdentityService and go straight to the execution layer, never to reasoning.
 */
@Processor(TASK_EXECUTION_QUEUE, { concurrency: 1 })
export class TaskExecutionProcessor extends WorkerHost {
  constructor(
    @Inject(EXECUTION_PROVIDER)
    private readonly executionProvider: ExecutionProvider,
    @InjectQueue(TASK_EXECUTION_QUEUE)
    private readonly taskQueue: Queue<TaskExecutionJobData>,
    private readonly taskReasoning: TaskReasoningService,
    private readonly workflows: WorkflowService,
    private readonly tasks: TaskService,
    private readonly metrics: MetricsService,
    private readonly memory: MemoryRetrievalService,
    private readonly privacyFilter: PrivacyFilterService,
    private readonly identity: IdentityService,
    private readonly reporting: ReportingService,
  ) {
    super();
  }

  /**
   * Runs the queued Task and records how it ended. Returns `null` without running when the
   * Workflow is not `running` or the Task is no longer `pending` (paused, or delivered twice);
   * a paused Task stays pending and is picked up again when its Job is next queued.
   */
  async process(job: Job<TaskExecutionJobData>): Promise<TaskRunOutcome | null> {
    const { workflowId, taskId } = job.data;
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow?.state !== 'running') return null;
    const task = await this.tasks.findTaskWithLineage(taskId);
    if (task?.status !== 'pending') return null;

    await this.tasks.markTaskRunning(taskId);
    try {
      const context = await this.memory.retrieveSafeContext({
        owner: workflow.owner,
        query: task.action,
        limit: TASK_CONTEXT_RECORD_LIMIT,
      });
      const run: TaskRun = { workflowId, task, safeContext: context.promptBlock };
      const end = await this.runSteps(run);
      await this.finish(run, workflow.owner, end);
      return {
        taskId,
        status: end.status,
        summary: end.summary,
        iterations: end.history.length,
        retryAfterMinutes: end.retryAfterMinutes,
      };
    } catch (error) {
      await this.tasks.markTaskFailed({ taskId, reason: error instanceof Error ? error.message : String(error) });
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
      jobObjective: run.task.job.objective,
      safeContext: run.safeContext,
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

  /**
   * Sends one step to the execution layer, with the login for `step.platform` when the Workflow has one.
   */
  private async executeStep(run: TaskRun, step: PlannedStep): Promise<ExecutionResult> {
    const credentials =
      step.platform === null ? null : await this.identity.getCredentials({ workflowId: run.workflowId, platform: step.platform });
    return this.executionProvider.runTask({
      taskId: run.task.id,
      instruction: step.instruction,
      context: run.safeContext,
      maxSteps: EXECUTION_MAX_STEPS,
      credentials,
    });
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
   * Saves how the Task ended, stores its learnings, and moves the Job along:
   * complete queues the next Task, deferred re-queues this one after the delay.
   */
  private async finish(run: TaskRun, owner: string, end: StepsEnd): Promise<void> {
    const { workflowId, task } = run;
    switch (end.status) {
      case 'complete': {
        const metricReadings = end.history.reduce<Record<string, number>>(
          (readings, step) => ({ ...readings, ...step.result.metricReadings }),
          {},
        );
        await this.tasks.markTaskComplete({ taskId: task.id, result: { summary: end.summary, metricReadings, completedAt: new Date() } });
        if (Object.keys(metricReadings).length > 0) {
          await this.metrics.recordReadings({ unitOfWorkId: task.job.unitOfWorkId, taskId: task.id, readings: metricReadings });
        }
        const next = await this.tasks.findNextPendingTask(task.jobId);
        if (next !== null) await this.taskQueue.add(next.id, { workflowId, taskId: next.id });
        break;
      }
      case 'failed':
        await this.tasks.markTaskFailed({ taskId: task.id, reason: end.summary });
        break;
      case 'escalated':
        await this.reporting.raiseEscalation({ workflowId, taskId: task.id, question: end.summary });
        break;
      case 'deferred':
        await this.tasks.markTaskPending(task.id);
        await this.taskQueue.add(task.id, { workflowId, taskId: task.id }, { delay: (end.retryAfterMinutes ?? 0) * MS_PER_MINUTE });
        break;
    }
    for (const content of end.learnings) {
      await this.memory.recordLearning({ owner, workflowId, content });
    }
  }
}
