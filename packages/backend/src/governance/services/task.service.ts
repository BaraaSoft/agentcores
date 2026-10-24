import type { TaskStatus } from '@ahe/agent-core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { TaskEntity } from '../entities/task.entity';
import type { CompleteTaskInput } from '../types/complete-task-input';
import type { CreateTasksInput } from '../types/create-tasks-input';
import type { StopTaskInput } from '../types/stop-task-input';

/**
 * Persistence and status transitions of Tasks:
 * pending → running → complete | failed | escalated | deferred, then escalated | deferred → running
 * or back to pending. A Job's current Task (its lowest-sequence Task not yet complete) decides the Job's state.
 *
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
   * Adds ordered pending Tasks to a Job, after any it already has.
   */
  async createTasks(input: CreateTasksInput): Promise<TaskEntity[]> {
    if (input.actions.length === 0) return [];
    const lastSequence = (await this.tasks.maximum('sequence', { jobId: input.jobId })) ?? 0;
    return this.tasks.save(
      input.actions.map((action, index) =>
        this.tasks.create({
          workflowId: input.workflowId,
          jobId: input.jobId,
          action,
          sequence: lastSequence + index + 1,
          status: 'pending',
        }),
      ),
    );
  }

  /**
   * True once the Job has been broken into Tasks.
   */
  async hasTasks(jobId: string): Promise<boolean> {
    return this.tasks.exists({ where: { jobId } });
  }

  /**
   * Loads a Task with its Job, Unit of Work, and Strategy — everything the Task processor needs.
   */
  async findTaskWithLineage(taskId: string): Promise<TaskEntity | null> {
    return this.tasks.findOne({
      where: { id: taskId },
      relations: { job: { unitOfWork: { strategy: true } } },
    });
  }

  /**
   * The Job's current Task — its lowest-sequence Task that is not `complete` — when that Task is
   * `pending`; otherwise null. A running, deferred, escalated, or failed current Task holds the Job,
   * so a Job never skips past a stuck Task.
   */
  async findNextPendingTask(jobId: string): Promise<TaskEntity | null> {
    const current = await this.tasks.findOne({
      where: { jobId, status: Not<TaskStatus>('complete') },
      order: { sequence: 'ASC' },
    });
    return current?.status === 'pending' ? current : null;
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
   * running → complete, storing the result.
   */
  async markTaskComplete(input: CompleteTaskInput): Promise<boolean> {
    return this.transition(input.taskId, ['running'], {
      status: 'complete',
      result: input.result,
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
