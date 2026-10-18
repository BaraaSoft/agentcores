import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
import type { CompleteTaskInput } from '../types/complete-task-input';
import type { CreateTasksInput } from '../types/create-tasks-input';
import type { StopTaskInput } from '../types/stop-task-input';

/**
 * Persistence and status transitions of Tasks:
 * pending → running → complete | failed | escalated, and running → pending when deferred.
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
   * Loads a Task with its Job, Unit of Work, and Strategy — everything the Task processor needs.
   */
  async findTaskWithLineage(taskId: string): Promise<TaskEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * The Job's lowest-sequence pending Task, or null when none is left.
   * Returns null while any Task of the Job is running or escalated, so a Job's Tasks run in order.
   */
  async findNextPendingTask(jobId: string): Promise<TaskEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * pending → running. Stamps `startedAt`.
   */
  async markTaskRunning(taskId: string): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * running → pending, for a Task deferred by a temporary gate. Clears `startedAt`.
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
