import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
import type { CompleteTaskInput } from '../types/complete-task-input';
import type { CreateTasksInput } from '../types/create-tasks-input';
import type { ListPendingTasksInput } from '../types/list-pending-tasks-input';
import type { StopTaskInput } from '../types/stop-task-input';

/**
 * Persistence and status transitions of Tasks:
 * pending → running → complete | failed | escalated.
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
   * Loads a Task with its Job, Unit of Work, and Strategy — everything the harness needs.
   */
  async findTaskWithLineage(taskId: string): Promise<TaskEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * Next pending Tasks for a Workflow, weighted by each Unit's allocation share.
   */
  async listPendingTasks(input: ListPendingTasksInput): Promise<TaskEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * How many of the Workflow's Tasks are running right now.
   */
  async countRunningTasks(workflowId: string): Promise<number> {
    throw new NotImplementedException();
  }

  /**
   * pending → running. Stamps `startedAt`.
   */
  async markTaskRunning(taskId: string): Promise<void> {
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
