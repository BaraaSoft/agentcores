import type { TaskStatus } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { TaskEntity } from '../entities/task.entity';
import type { CompleteTaskInput } from '../types/complete-task-input';
import type { ReplaceRemainingTasksInput } from '../types/replace-remaining-tasks-input';
import type { StopTaskInput } from '../types/stop-task-input';
import type { StrayRunningTask } from '../types/stray-running-task';

/** Statuses a Task never leaves. A `complete` or `failed` Task is reviewed by Job reasoning before the Job moves on. */
export const FINISHED_TASK_STATUSES: readonly TaskStatus[] = ['complete', 'failed', 'cancelled'];

/** Finished Tasks that Job reasoning reviews; cancelled Tasks never ran, so there is nothing to review. */
export const REVIEWABLE_TASK_STATUSES: readonly TaskStatus[] = ['complete', 'failed'];

/**
 * Persistence and status transitions of Tasks:
 * pending → running → complete | failed | escalated | deferred; escalated | deferred → running or
 * back to pending; pending → cancelled when Job reasoning drops it from the plan.
 *
 * A Job's current Task is its lowest-sequence Task that is not finished (complete, failed, cancelled).
 * Every `markTask*` method changes the status only from the states it lists and returns whether it
 * did, so a stale or duplicate caller changes nothing.
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * Makes `input.tasks` the Job's plan for every Task that has not started: cancels its pending Tasks
   * and appends the new ones after its last Task. Leaves the plan alone when it is unchanged. Also used
   * for the first plan, when the Job has no Tasks. Returns the Job's pending Tasks afterwards, in order.
   */
  async replaceRemainingTasks(input: ReplaceRemainingTasksInput): Promise<TaskEntity[]> {
    return this.tasks.manager.transaction(async (manager) => {
      const tasks = manager.getRepository(TaskEntity);
      const pending = await tasks.find({ where: { jobId: input.jobId, status: 'pending' }, order: { sequence: 'ASC' } });
      const isUnchanged =
        pending.length === input.tasks.length &&
        pending.every(
          (task, index) => task.action === input.tasks[index].action && task.skillType === input.tasks[index].skillType,
        );
      if (isUnchanged) return pending;

      if (pending.length > 0) {
        await tasks.update({ id: In(pending.map((task) => task.id)), status: 'pending' }, { status: 'cancelled' });
      }
      const lastSequence = (await tasks.maximum('sequence', { jobId: input.jobId })) ?? 0;
      return tasks.save(
        input.tasks.map(({ action, skillType }, index) =>
          tasks.create({
            workflowId: input.workflowId,
            jobId: input.jobId,
            action,
            skillType,
            sequence: lastSequence + index + 1,
            status: 'pending',
          }),
        ),
      );
    });
  }

  /**
   * True once the Job has been given a plan.
   */
  async hasTasks(jobId: string): Promise<boolean> {
    return this.tasks.exists({ where: { jobId } });
  }

  /**
   * All of the Job's Tasks, in sequence order.
   */
  async listTasks(jobId: string): Promise<TaskEntity[]> {
    return this.tasks.find({ where: { jobId }, order: { sequence: 'ASC' } });
  }

  /**
   * Every Task of these Jobs, in sequence order within each Job — the progress view of the work.
   */
  async listTasksInJobs(jobIds: readonly string[]): Promise<TaskEntity[]> {
    if (jobIds.length === 0) return [];
    return this.tasks.find({ where: { jobId: In([...jobIds]) }, order: { sequence: 'ASC' } });
  }

  /**
   * True when the owner paused the run since the Task started: its Unit of Work is no longer `running`.
   */
  async isTaskPaused(taskId: string): Promise<boolean> {
    const row = await this.tasks
      .createQueryBuilder('task')
      .innerJoin('task.job', 'job')
      .innerJoin('job.unitOfWork', 'unit')
      .select('unit.state', 'state')
      .where('task.id = :taskId', { taskId })
      .getRawOne<{ state: string }>();
    return row !== undefined && row.state !== 'running';
  }

  /**
   * How many Tasks are `running` now, by Workflow. A paused Workflow with none has freed the machine.
   */
  async countRunningTasksByWorkflow(): Promise<Map<string, number>> {
    const rows = await this.tasks
      .createQueryBuilder('task')
      .select('task.workflowId', 'workflowId')
      .addSelect('COUNT(*)::int', 'count')
      .where('task.status = :running', { running: 'running' })
      .groupBy('task.workflowId')
      .getRawMany<{ workflowId: string; count: number }>();
    return new Map(rows.map((row) => [row.workflowId, row.count]));
  }

  /**
   * The `running` Tasks whose work is not running: the Job is closed, the Unit of Work or its Workflow
   * is not `running`, the Task names another Workflow than its Unit, or it started before `stuckBefore`.
   * Oldest first.
   */
  async listStrayRunningTasks(stuckBefore: Date): Promise<StrayRunningTask[]> {
    return this.tasks
      .createQueryBuilder('task')
      .innerJoin('task.job', 'job')
      .innerJoin('job.unitOfWork', 'unit')
      .innerJoin('unit.workflow', 'workflow')
      .select('task.id', 'taskId')
      .addSelect('task.action', 'action')
      .addSelect('task.startedAt', 'startedAt')
      .addSelect('task.workflowId', 'taskWorkflowId')
      .addSelect('job.id', 'jobId')
      .addSelect('job.name', 'jobName')
      .addSelect('job.outcomeStatus', 'jobOutcome')
      .addSelect('unit.id', 'unitOfWorkId')
      .addSelect('unit.name', 'unitOfWorkName')
      .addSelect('unit.state', 'unitOfWorkState')
      .addSelect('workflow.id', 'workflowId')
      .addSelect('workflow.state', 'workflowState')
      .addSelect('workflow.updatedAt', 'workflowUpdatedAt')
      .where('task.status = :running', { running: 'running' })
      .andWhere(
        new Brackets((stray) =>
          stray
            .where('job.outcomeStatus IS NOT NULL')
            .orWhere('unit.state != :running')
            .orWhere('workflow.state != :running')
            .orWhere('task.workflowId != unit.workflowId')
            .orWhere('task.startedAt < :stuckBefore', { stuckBefore }),
        ),
      )
      .orderBy('task.startedAt', 'ASC', 'NULLS FIRST')
      .getRawMany<StrayRunningTask>();
  }

  /**
   * Loads a Task with its Job, Unit of Work, and Strategy — everything the Task processor needs: the
   * Unit's state gates the run, and the Strategy names the owner.
   */
  async findTaskWithLineage(taskId: string): Promise<TaskEntity | null> {
    return this.tasks.findOne({
      where: { id: taskId },
      relations: { job: { unitOfWork: { strategy: true } } },
    });
  }

  /**
   * The Job's earliest complete or failed Task that Job reasoning has not reviewed yet, or null.
   */
  async findUnreviewedTask(jobId: string): Promise<TaskEntity | null> {
    return this.tasks.findOne({
      where: { jobId, status: In([...REVIEWABLE_TASK_STATUSES]), reviewedAt: IsNull() },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * The Job's current Task — its lowest-sequence Task that is not finished — when that Task is
   * `pending` and every finished Task has been reviewed; otherwise null. A running, deferred, or
   * escalated current Task holds the Job, and so does a finished Task awaiting review, so a Job
   * never moves on before Job reasoning has seen the last result.
   */
  async findNextPendingTask(jobId: string): Promise<TaskEntity | null> {
    if ((await this.findUnreviewedTask(jobId)) !== null) return null;
    const current = await this.tasks.findOne({
      where: { jobId, status: In(['pending', 'running', 'deferred', 'escalated'] satisfies TaskStatus[]) },
      order: { sequence: 'ASC' },
    });
    return current?.status === 'pending' ? current : null;
  }

  /**
   * Stamps a finished Task as reviewed by Job reasoning.
   */
  async markTaskReviewed(taskId: string): Promise<boolean> {
    const update = await this.tasks.update(
      { id: taskId, status: In([...REVIEWABLE_TASK_STATUSES]), reviewedAt: IsNull() },
      { reviewedAt: new Date() },
    );
    return (update.affected ?? 0) > 0;
  }

  /**
   * pending | deferred → running. Stamps `startedAt`. Returns false when another worker already
   * took the Task, so the caller must not run it.
   */
  async markTaskRunning(taskId: string): Promise<boolean> {
    return this.transition(taskId, ['pending', 'deferred'], { status: 'running', startedAt: new Date() });
  }

  /**
   * running → deferred, for a Task stopped by a temporary gate. Clears `startedAt`.
   */
  async markTaskDeferred(taskId: string): Promise<boolean> {
    return this.transition(taskId, ['running'], { status: 'deferred', startedAt: null });
  }

  /**
   * escalated | deferred → pending: the owner approved an escalation, or a deferred Task came due
   * while its Workflow was paused. The Task runs when its Job is next queued.
   */
  async markTaskPending(taskId: string): Promise<boolean> {
    return this.transition(taskId, ['escalated', 'deferred'], { status: 'pending', startedAt: null, failureReason: null });
  }

  /**
   * running → complete, storing the result and the location.
   */
  async markTaskComplete(input: CompleteTaskInput): Promise<boolean> {
    return this.transition(input.taskId, ['running'], {
      status: 'complete',
      result: input.result,
      locationPath: input.locationPath,
      locationDetails: input.locationDetails,
      completedAt: input.result.completedAt,
    });
  }

  /**
   * running | escalated → failed, storing the reason. Escalated covers an owner rejecting the escalation.
   */
  async markTaskFailed(input: StopTaskInput): Promise<boolean> {
    return this.transition(input.taskId, ['running', 'escalated'], { status: 'failed', failureReason: input.reason });
  }

  /**
   * running → failed for every Task still `running`, storing the reason. Called at start-up: Tasks run in
   * this process only, so a Task still `running` then was cut off by a stop or a crash, maybe half done.
   * Returns how many Tasks it ended.
   */
  async failInterruptedTasks(reason: string): Promise<number> {
    const update = await this.tasks.update({ status: 'running' }, { status: 'failed', failureReason: reason });
    return update.affected ?? 0;
  }

  /**
   * running → escalated: held until the owner decides. The reason is stored in `failureReason`.
   */
  async markTaskEscalated(input: StopTaskInput): Promise<boolean> {
    return this.transition(input.taskId, ['running'], { status: 'escalated', failureReason: input.reason });
  }

  private async transition(
    taskId: string,
    from: readonly TaskStatus[],
    changes: QueryDeepPartialEntity<TaskEntity>,
  ): Promise<boolean> {
    const update = await this.tasks.update({ id: taskId, status: In([...from]) }, changes);
    return (update.affected ?? 0) > 0;
  }
}
