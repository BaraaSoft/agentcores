import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import type { PlanUnitJobsInput } from './types/plan-unit-jobs-input';
import type { ReviewUnitInput } from './types/review-unit-input';
import type { UnitJobPlan } from './types/unit-job-plan';
import type { UnitReview } from './types/unit-review';

/**
 * Unit-of-Work-level reasoning: one theme of work, such as "Reddit Presence". Decides which Jobs
 * serve the Unit's success criteria, and reviews how the Unit did.
 * It reads Job evaluations and Unit metrics only — never Tasks or steps.
 */
@Injectable()
export class UnitReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Proposes Jobs for one Unit: at the start of a Strategy, or when the Unit's Jobs have run out.
   */
  async planJobs(input: PlanUnitJobsInput): Promise<UnitJobPlan> {
    throw new NotImplementedException();
  }

  /**
   * Reviews one Unit at the end of a cycle, producing the summary the Strategy review reads.
   */
  async reviewUnit(input: ReviewUnitInput): Promise<UnitReview> {
    throw new NotImplementedException();
  }
}
