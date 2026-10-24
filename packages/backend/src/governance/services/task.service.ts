import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
import type { CompleteTaskInput } from '../types/complete-task-input';
import type { CreateTasksInput } from '../types/create-tasks-input';
import type { StopTaskInput } from '../types/stop-task-input';

/**
 * Persistence and status transitions of Tasks:
 * pending → running → complete | failed | escalated | deferred, then escalated | deferred → running
 * or back to pending. A Job's current Task (its lowest-sequence Task not yet complete) decides the Job's state.
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * Adds ordered pending Tasks to a Job.
   */
  async createTasks(input: CreateTasksInput): Promise<TaskEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * True once the Job has been broken into Tasks.
   */
  async hasTasks(jobId: string): Promise<boolean> {
    throw new NotImplementedException();
  }

  /**
   * Loads a Task with its Job, Unit of Work, and Strategy — everything the Task processor needs.
   */
  async findTaskWithLineage(taskId: string): Promise<TaskEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * The Job's current Task — its lowest-sequence Task that is not `complete` — when that Task is
   * `pending`; otherwise null. A running, deferred, escalated, or failed current Task holds the Job,
   * so a Job never skips past a stuck Task.
   */
  async findNextPendingTask(jobId: string): Promise<TaskEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * pending | deferred → running. Stamps `startedAt`.
   */
  async markTaskRunning(taskId: string): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * running → deferred, for a Task stopped by a temporary gate. Clears `startedAt`.
   */
  async markTaskDeferred(taskId: string): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * escalated | deferred → pending: the owner approved an escalation, or a deferred Task came due
   * while its Workflow was paused. The Task runs when its Job is next queued.
   */
  async markTaskPending(taskId: string): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * running → complete, storing the result.
   */
  async markTaskComplete(input: CompleteTaskInput): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * running → failed, storing the reason.
   */
  async markTaskFailed(input: StopTaskInput): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * running → escalated: paused until the owner decides.
   */
  async markTaskEscalated(input: StopTaskInput): Promise<void> {
    throw new NotImplementedException();
  }
}
