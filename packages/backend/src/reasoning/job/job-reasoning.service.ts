import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import type { EvaluateJobInput } from './types/evaluate-job-input';
import type { JobEvaluation } from './types/job-evaluation';
import type { JobPlan } from './types/job-plan';
import type { JobReasoningInput } from './types/job-reasoning-input';

/**
 * Job-level reasoning: one objective, such as "Engage with r/AICompanion". Plans the Tasks that
 * achieve it, revises the plan after every finished Task, and decides when the Job is over.
 * It reads Task outcomes only — never individual steps.
 */
@Injectable()
export class JobReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * The plan for every Task not started yet. First call (no outcomes): the full ordered plan.
   * After each finished Task: continue, edit the plan, or end the Job as met or abandoned.
   */
  async planTasks(input: JobReasoningInput): Promise<JobPlan> {
    throw new NotImplementedException();
  }

  /**
   * Judges a Job still open at cycle end against its objective, producing the summary the Unit review reads.
   */
  async evaluateJob(input: EvaluateJobInput): Promise<JobEvaluation> {
    throw new NotImplementedException();
  }
}
