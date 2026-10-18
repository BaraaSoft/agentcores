import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from '../entities/job.entity';
import type { CreateJobInput } from '../types/create-job-input';
import type { ListStartableJobsInput } from '../types/list-startable-jobs-input';

/**
 * Persistence of Jobs. A Job is active while a Task of it is running or escalated.
 */
@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobs: Repository<JobEntity>,
  ) {}

  /**
   * Creates a Job under an existing Unit of Work.
   */
  async createJob(input: CreateJobInput): Promise<JobEntity> {
    throw new NotImplementedException();
  }

  /**
   * Returns the Job with its Unit of Work loaded, or null.
   */
  async findJobById(jobId: string): Promise<JobEntity | null> {
    throw new NotImplementedException();
  }

  /**
   * True while the Job still has pending or running Tasks.
   */
  async hasOpenTasks(jobId: string): Promise<boolean> {
    throw new NotImplementedException();
  }

  /**
   * Jobs of the Workflow's active Strategy that have work left and nothing running: no Tasks yet,
   * or a pending Task with none running or escalated. Weighted by each Unit's allocation share.
   */
  async listStartableJobs(input: ListStartableJobsInput): Promise<JobEntity[]> {
    throw new NotImplementedException();
  }

  /**
   * How many of the Workflow's Jobs are active right now.
   */
  async countActiveJobs(workflowId: string): Promise<number> {
    throw new NotImplementedException();
  }
}
