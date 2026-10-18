import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import type { BreakDownJobInput } from './types/break-down-job-input';
import type { EvaluateJobInput } from './types/evaluate-job-input';
import type { JobBreakdown } from './types/job-breakdown';
import type { JobEvaluation } from './types/job-evaluation';

/**
 * Job-level reasoning: one objective, such as "Engage with r/AICompanion". Decides which Tasks
 * achieve it, and judges whether they did.
 * It reads Task outcomes only — never individual steps.
 */
@Injectable()
export class JobReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Splits a Job into an ordered list of atomic Task actions.
   */
  async breakDownJob(input: BreakDownJobInput): Promise<JobBreakdown> {
    throw new NotImplementedException();
  }

  /**
   * Judges a Job against its objective from its Task outcomes, producing the summary the Unit review reads.
   */
  async evaluateJob(input: EvaluateJobInput): Promise<JobEvaluation> {
    throw new NotImplementedException();
  }
}
