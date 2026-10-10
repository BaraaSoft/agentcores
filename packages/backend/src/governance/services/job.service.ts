import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from '../entities/job.entity';
import type { CreateJobInput } from '../types/create-job-input';

/**
 * Persistence of Jobs.
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
}
