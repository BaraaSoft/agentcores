import { Injectable, NotImplementedException } from '@nestjs/common';
import { ReasoningModelClient } from './reasoning-model.client';
import type { BlockerDecision } from './types/blocker-decision';
import type { BreakDownJobInput } from './types/break-down-job-input';
import type { DecideOnBlockerInput } from './types/decide-on-blocker-input';
import type { EvaluateOutcomeInput } from './types/evaluate-outcome-input';
import type { JobBreakdown } from './types/job-breakdown';
import type { OutcomeEvaluation } from './types/outcome-evaluation';
import type { PlanNextStepInput } from './types/plan-next-step-input';
import type { PlanStrategyInput } from './types/plan-strategy-input';
import type { PlannedStep } from './types/planned-step';
import type { ReviewStrategyInput } from './types/review-strategy-input';
import type { StrategyPlan } from './types/strategy-plan';
import type { StrategyReview } from './types/strategy-review';

/**
 * The reasoning layer. Every strategic decision in AHE goes through here:
 * planning Strategies and Jobs, choosing the next step, and judging results.
 * It only ever sees text — compressed summaries and safe memory context.
 */
@Injectable()
export class ReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Proposes the Units of Work and first Jobs for a new 30-day Strategy.
   */
  async planStrategy(input: PlanStrategyInput): Promise<StrategyPlan> {
    throw new NotImplementedException();
  }

  /**
   * Splits a Job into an ordered list of atomic Task actions.
   */
  async breakDownJob(input: BreakDownJobInput): Promise<JobBreakdown> {
    throw new NotImplementedException();
  }

  /**
   * Decides the next step for a Task given what has happened so far.
   */
  async planNextStep(input: PlanNextStepInput): Promise<PlannedStep> {
    throw new NotImplementedException();
  }

  /**
   * Judges an executed step: is the Task complete, should it retry, what to record.
   */
  async evaluateOutcome(input: EvaluateOutcomeInput): Promise<OutcomeEvaluation> {
    throw new NotImplementedException();
  }

  /**
   * Decides what to do when the execution layer reports a blocker (CAPTCHA, verification code,
   * rate limit, …). Prefers paths that avoid the gate — waiting, another approach, another channel,
   * the official API — and asks the owner only for gates that only the owner can clear.
   */
  async decideOnBlocker(input: DecideOnBlockerInput): Promise<BlockerDecision> {
    throw new NotImplementedException();
  }

  /**
   * Grades a finished Strategy and proposes reallocations, deprecations, and new Jobs.
   */
  async reviewStrategy(input: ReviewStrategyInput): Promise<StrategyReview> {
    throw new NotImplementedException();
  }
}
